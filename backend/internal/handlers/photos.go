package handlers

import (
	"context"
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
	const LIMIT = 10
	var err error
	cursor := c.Query("cursor")
	decodedCursor, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode from Base64"})
		log.Println(err)
		return
	}

	if string(decodedCursor) == "" {
		log.Println("[DECODED CURSOR] Decoded cursor is empty - requesting first page")
		photos, err := database.GetAllPhotos(h.DB, time.Time{}, "", LIMIT)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch photos"})
			return
		}

		c.JSON(http.StatusOK, photos)
		return
	}

	log.Println("[DECODED CURSOR] " + string(decodedCursor))

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
	if bindError := c.ShouldBindJSON(&deleteRequest); bindError != nil {
		log.Println("[ERROR]: Could not bind")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "booyah"})
		return
	}

	if len(deleteRequest.DeleteIDsArray) == 0 {
		log.Println("[DELETE:ERROR]: 0 Photos recieved to delete")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "0 Photos recieved to delete"})
		return
	}

	tx, err := h.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		log.Println("[DELETE:ERROR]: Could not start a transaction to delete")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start a transaction to delete"})
		return
	}
	defer tx.Rollback()

	var fk int
	tx.QueryRow("PRAGMA foreign_keys;").Scan(&fk)
	log.Println("[INFO]: foreign_keys =", fk)

	// Get snapshot of Rows to delete to maintain state
	placeholders := make([]string, len(deleteRequest.DeleteIDsArray))
	args := make([]any, len(deleteRequest.DeleteIDsArray))

	for i, id := range deleteRequest.DeleteIDsArray {
		placeholders[i] = "?"
		args[i] = id
	}

	var snapshotRows []models.Photo

	toDeleteSnapshot := fmt.Sprintf(`
	SELECT id, image_url, thumbnail_url, created_at
	FROM photos WHERE id IN (%s)`, strings.Join(placeholders, ","))

	toDeleteRows, err := tx.QueryContext(c.Request.Context(), toDeleteSnapshot, args...)
	if err != nil {
		log.Println("[DELETE:ERROR]: An error occured while trying to query the Database to take a snapshot", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured while trying to query the Database to take a snapshot"})
		return
	}
	defer toDeleteRows.Close()

	for toDeleteRows.Next() {
		var p models.Photo

		if scanErr := toDeleteRows.Scan(
			&p.ID,
			&p.ImageURL,
			&p.ThumbnailURL,
			&p.CreatedAt,
		); scanErr != nil {
			log.Printf("[DELETE:ERROR] An error occured while scanning query output to structs - %v", scanErr)
			c.JSON(http.StatusInternalServerError, "An error occured while scanning query output to structs")
			return
		}

		snapshotRows = append(snapshotRows, p)
	}

	if err := toDeleteRows.Err(); err != nil {
		log.Println("[DELETE:ERROR]: An error occured while reading the rows of Snapshot query into slice", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured while reading the rows of Snapshot query into slice"})
		return
	}

	deletePhotos := fmt.Sprintf("DELETE FROM photos WHERE id IN (%s)", strings.Join(placeholders, ","))
	if _, deleteErr := tx.ExecContext(c.Request.Context(), deletePhotos, args...); deleteErr != nil {
		log.Printf("[DELETE:ERROR]: An error occured while trying to delete the photos from the DB - %v", deleteErr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured while trying to delete the photos from the DB"})
		return
	}

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
	if _, orphanTagsErr := tx.Exec(removeOrphanTags); orphanTagsErr != nil {
		log.Printf("[DELETE:ERROR]: Could not delete orphaned tags - %v", orphanTagsErr)
		return
	}
	if commitErr := tx.Commit(); commitErr != nil {
		log.Printf("[DELETE:ERROR] An error occured commiting the transaction to the Database - %v", commitErr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured commiting the transaction to the Database"})
		return
	}

	log.Printf("[DELETE:SUCCESS]: Successfully completed all deletions from Database")

	var failedList []models.Photo
	var blobDeleted int
	for _, photo := range snapshotRows {
		if err := h.deleteBlobs(photo.ImageURL, photo.ThumbnailURL, c); err != nil {
			failedList = append(failedList, photo)
			log.Println(err.Error())
		} else {
			blobDeleted++
		}
	}
	// TODO: Persistent retry queue: add failed photos to failed_storage_deletes and poll them frequently
	if len(failedList) != 0 {
		database.AddToFailedStore(h.DB, c, failedList)
	}

	// TODO: add failed_list value in resp (maybe)
	resp := gin.H{
		"db_deleted": len(args),
		"storage": gin.H{
			"success": blobDeleted,
			"failed":  len(failedList),
		},
	}

	c.JSON(http.StatusOK, resp)
}

// DELETE /api/admin/photos/failed
func (h *PhotoHandler) NukeFailedBlobs(c *gin.Context) {

	type FailedRow struct {
		id       string
		webURL   string
		thumbURL string
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()
	var retryList []FailedRow
	var successList []string
	var successCounter int

	getFailedList := `SELECT id, web_url, thumbnail_url FROM failed_storage_deletes`
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("An error occured when trying to start a new transaction - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured when trying to start a new transaction"})
		return
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, getFailedList)
	if err != nil {
		log.Printf("An error occured querying to the database - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured querying to the database"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var fr FailedRow
		if err := rows.Scan(&fr.id, &fr.webURL, &fr.thumbURL); err != nil {
			log.Printf("An error occured in trying to scan the rows from the QueryResult - %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured in trying to scan the rows from the QueryResult"})
			return
		}

		retryList = append(retryList, fr)
	}

	if err := rows.Err(); err != nil {
		log.Printf("An error occured in reading Rows - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured in reading Rows"})
		return
	}

	if len(retryList) == 0 {
		if err := tx.Commit(); err != nil {
			log.Printf("commit failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": 0,
			"failed":  len(retryList),
		})
		return
	}

	for _, photo := range retryList {
		if err := h.deleteBlobs(photo.webURL, photo.thumbURL, c); err != nil {
			log.Printf("An error trying to delete the Photo (%s) - %v", photo.id, err)
			continue
		}
		successList = append(successList, photo.id)
		successCounter++
	}

	if len(successList) == 0 {
		if err := tx.Commit(); err != nil {
			log.Printf("commit failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": 0,
			"failed":  len(retryList),
		})
		return
	}

	placeholders := make([]string, len(successList))
	args := make([]any, len(successList))

	for i, id := range successList {
		placeholders[i] = "?"
		args[i] = id
	}

	deleteFromFailedStore := fmt.Sprintf(`DELETE FROM failed_storage_deletes WHERE id IN (%s)`, strings.Join(placeholders, ","))

	_, deleteErr := tx.ExecContext(ctx, deleteFromFailedStore, args...)
	if deleteErr != nil {
		log.Printf("An error occured in trying to delete the succeeded rows from failed_storage_deletes - %v", deleteErr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An error occured in trying to delete the succeeded rows from failed_storage_deletes"})
		return
	}
	if err := tx.Commit(); err != nil {
		log.Printf("commit failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "commit failed"})
		return
	}

	resp := gin.H{
		"success": successCounter,
		"failed":  (len(retryList) - successCounter),
	}

	c.JSON(http.StatusOK, resp)
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

func (h *PhotoHandler) deleteBlobs(imageURL string, thumbnailURL string, c *gin.Context) error {

	g, ctx := errgroup.WithContext(c.Request.Context())

	g.Go(func() error {
		if imageURL == "" {
			return fmt.Errorf("ImageURL received is Empty - skipping")
		}
		webKey, err := getKeyFromURL(imageURL)
		if err != nil {
			return fmt.Errorf("[ERROR]: Failed to parse webKey from Image URL")
		}

		if webKey == "" {
			return fmt.Errorf("[ERROR]: webKey is empty so cannot proceed with deletion")
		}

		log.Printf("[DELETE]: Deleting high-res file: %s", webKey)
		return h.R2Service.DeleteFile(ctx, webKey)
	})

	g.Go(func() error {
		if thumbnailURL == "" {
			return fmt.Errorf("ThumbnailURL received is Empty - skipping")
		}
		thumbKey, err := getKeyFromURL(thumbnailURL)
		if err != nil {
			return fmt.Errorf("[ERROR]: Failed to parse thumbKey from Thumbnail URL")
		}

		if thumbKey == "" {
			return fmt.Errorf("[ERROR]: thumbKey is empty so cannot proceed with deletion")
		}

		log.Printf("[DELETE]: Deleting thumbnail file: %s", thumbKey)
		return h.R2Service.DeleteFile(ctx, thumbKey)
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("Failed to delete image files from R2 - %v", err)
	}

	return nil
}
