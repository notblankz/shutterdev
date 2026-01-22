package handlers

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"shutterdev/backend/internal/database"
	"shutterdev/backend/internal/models"
	"shutterdev/backend/internal/services"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/errgroup"
)

type PhotoHandler struct {
	DB        *sql.DB
	R2Service *services.R2Service
}

type DeleteRequest struct {
	DeleteIDsArray []string `json:"DeleteIDs"`
}

func NewPhotoHandler(db *sql.DB, r2 *services.R2Service) *PhotoHandler {
	return &PhotoHandler{
		DB:        db,
		R2Service: r2,
	}
}

// GET /api/photos?cursor=x (x is base64 string of json)
func (h *PhotoHandler) GetAllPhotos(c *gin.Context) {
	// TODO: Find optimal limit value
	const LIMIT = 10
	var err error
	cursor := c.Query("cursor")
	decodedCursor, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode from Base64"})
		log.Println(err)
		return
	}

	log.Println("[DECODED CURSOR] " + string(decodedCursor))

	if string(decodedCursor) == "" {
		photos, err := database.GetAllPhotos(h.DB, time.Time{}, "", LIMIT)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch photos"})
			return
		}

		c.JSON(http.StatusOK, photos)
		return
	}

	var cursorObtained struct {
		CreatedAt time.Time `json:"created_at"`
		ID        string    `json:"id"`
	}

	err = json.Unmarshal([]byte(decodedCursor), &cursorObtained)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not parse JSON"})
		log.Println(err)
		return
	}

	log.Println("[CURSOR: created_at]" + (cursorObtained.CreatedAt).String())
	log.Println("[CURSOR: ID]" + cursorObtained.ID)
	photos, err := database.GetAllPhotos(h.DB, cursorObtained.CreatedAt, cursorObtained.ID, LIMIT)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch photos"})
		fmt.Println(err)
		return
	}

	c.JSON(http.StatusOK, photos)
}

// GET /api/photos/:id
func (h *PhotoHandler) GetPhotoByID(c *gin.Context) {
	idStr := c.Param("id")

	photo, err := database.GetPhotoByID(h.DB, idStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to Fetch photo"})
		return
	}
	if photo == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Photo Not Found"})
		return
	}

	c.JSON(http.StatusOK, photo)
}

// TODO: optimize multiple image upload pipeline
// TODO: add support for per image title, desc and tag selection during multiple image upload
// POST /api/admin/photos
func (h *PhotoHandler) UploadPhoto(c *gin.Context) {

	var imageCounter int
	responded := false

	form, err := c.MultipartForm()
	if err != nil {
		if !responded {
			responded = true
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error occured in decoding the multipart form"})
		}
		return
	}
	files := form.File["image"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "no images provided",
		})
		return
	}

	for _, file := range files {
		if err := h.processSingleImage(c, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		imageCounter++
	}

	c.JSON(http.StatusCreated, gin.H{"uploaded": imageCounter})
}

// TODO: Implement delete all photos
// DELETE /api/admin/photos
func (h *PhotoHandler) DeletePhoto(c *gin.Context) {

	var deleteRequest DeleteRequest
	var deleteCounter int

	if bindError := c.ShouldBindJSON(&deleteRequest); bindError != nil {
		log.Println("[ERROR]: Could not bind")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "booyah"})
		return
	}

	for _, photoID := range deleteRequest.DeleteIDsArray {
		if err := h.deleteSingleImage(c, photoID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		deleteCounter++
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Printf("[ERROR]: Could not start transaction to delete orphaned tags - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start a transaction to delete orphaned tags"})
		return
	}
	defer tx.Rollback()
	removeOrphanTags := `
	DELETE FROM tags
		WHERE id IN (
			SELECT t.id
			FROM tags t
			WHERE NOT EXISTS (
				SELECT 1
				FROM photo_tags pt
				WHERE pt.tag_id = t.id
			)
		);`
	_, orphanTagsErr := tx.Exec(removeOrphanTags)
	if orphanTagsErr != nil {
		log.Printf("[ERROR]: Could not delete orphaned tags - %v", orphanTagsErr)
		return
	}
	tx.Commit()
	log.Printf("[DELETE:SUCCESS]: Successfully removed orphaned tags")

	c.JSON(http.StatusOK, gin.H{"deleted": deleteCounter})
}

// <== Helper Functions ==>
func getKeyFromURL(fileURL string) (string, error) {
	parsedURL, err := url.Parse(fileURL)
	if err != nil {
		return "", err
	}

	return path.Clean(parsedURL.Path), nil
}

func (h *PhotoHandler) processSingleImage(c *gin.Context, file *multipart.FileHeader) error {

	const MaxUploadSize = 20 << 20

	imageData, err := file.Open()
	if err != nil {
		return fmt.Errorf("failed to open image")
	}
	defer imageData.Close()

	buffer := make([]byte, 512)
	n, err := imageData.Read(buffer)
	if err != nil {
		return fmt.Errorf("failed to read image")
	}

	contentType := http.DetectContentType(buffer[:n])
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowedTypes[contentType] {
		return fmt.Errorf("unsupported file type")
	}

	if seeker, ok := imageData.(io.Seeker); ok {
		if _, err := seeker.Seek(0, io.SeekStart); err != nil {
			return fmt.Errorf("failed to reset file pointer")
		}
	} else {
		return fmt.Errorf("file stream not seekable")
	}

	tagsStr := c.PostForm("tags")
	limitedReader := io.LimitReader(imageData, MaxUploadSize+1)

	webImage, thumbImage, exifData, thumbWidth, thumbHeight, err := services.ProcessImage(limitedReader)
	// TODO: make specific error handlers
	if err != nil {
		return fmt.Errorf("image processing failed")
	}

	ctx := c.Request.Context()

	// variables
	var errWebUpload error
	var webURL string
	var errThumbUpload error
	var thumbURL string

	var wg sync.WaitGroup

	wg.Go(func() {
		webFileName := services.GenerateUniqueFileName("web")
		webURL, errWebUpload = h.R2Service.UploadFile(ctx, webFileName, webImage)
	})

	wg.Go(func() {
		thumbFileName := services.GenerateUniqueFileName("thumbnails")
		thumbURL, errThumbUpload = h.R2Service.UploadFile(ctx, thumbFileName, thumbImage)
	})

	wg.Wait()

	// Error handling
	if errWebUpload != nil {
		return fmt.Errorf("Could not upload web image to R2 Bucket")
	} else if errThumbUpload != nil {
		return fmt.Errorf("Could not upload thumbnail image to R2 Bucket")
	}

	var tags []models.Tag
	tagNames := strings.SplitSeq(tagsStr, ",")
	for name := range tagNames {
		if strings.TrimSpace(name) != "" {
			tags = append(tags, models.Tag{Name: strings.TrimSpace(name)})
		}
	}
	photoModel := &models.Photo{
		ImageURL:     webURL,
		ThumbnailURL: thumbURL,
		ThumbWidth:   thumbWidth,
		ThumbHeight:  thumbHeight,
		Exif:         exifData,
		Tags:         tags,
		CreatedAt:    time.Now(),
	}

	if _, err := database.CreatePhoto(h.DB, photoModel); err != nil {
		return fmt.Errorf("Could not write image to database")
	}

	return nil
}

// TODO: delete source of truth (DB record first) then delete the R2 bucket urls
func (h *PhotoHandler) deleteSingleImage(c *gin.Context, idStr string) error {
	photo, err := database.GetPhotoByID(h.DB, idStr)
	if err != nil {
		return fmt.Errorf("Failed to fetch photo for deletion")
	}
	if photo == nil {
		return fmt.Errorf("Photo not found")
	}

	log.Printf("[DELETE:INFO]: Received Photo to delete: %s", photo.ID)

	if err := database.DeletePhoto(h.DB, idStr); err != nil {
		log.Printf("[ERROR]: Failed to delete photo from database: %s", err.Error())
		return fmt.Errorf("Failed to delete photo record")
	}

	log.Printf("[DELETE:SUCCESS]: Deleted Photo Row from DB")

	ctx := c.Request.Context()

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		webKey, err := getKeyFromURL(photo.ImageURL)
		if err != nil {
			log.Printf("[ERROR]: Failed to parse webKey: %s", err.Error())
			return fmt.Errorf("[ERROR]: Failed to parse webKey from Image URL")
		}

		if webKey == "" {
			return fmt.Errorf("[ERROR]: webKey is empty so cannot proceed with deletion")
		}

		log.Printf("[DELETE]: Deleting high-res file: %s", webKey)
		return h.R2Service.DeleteFile(ctx, webKey)
	})

	g.Go(func() error {
		thumbKey, err := getKeyFromURL(photo.ThumbnailURL)
		if err != nil {
			log.Printf("[WARNING]: Failed to parse thumbKey: %s", err.Error())
			return fmt.Errorf("[ERROR]: Failed to parse thumbKey from Thumbnail URL")
		}

		if thumbKey == "" {
			return fmt.Errorf("[ERROR]: thumbKey is empty so cannot proceed with deletion")
		}

		log.Printf("[DELETE]: Deleting thumbnail file: %s", thumbKey)
		return h.R2Service.DeleteFile(ctx, thumbKey)
	})

	if err := g.Wait(); err != nil {
		log.Printf("[ERROR]: Failed deleting files from R2: %s", err.Error())
		return fmt.Errorf("Failed to delete image files from R2")
	}

	log.Println("[DELETE:SUCCESS]: Fully Deleted Photo with ID: " + photo.ID)
	return nil
}
