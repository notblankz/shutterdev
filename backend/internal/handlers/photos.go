package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"net/url"
	"path"
	"shutterdev/backend/internal/database"
	"shutterdev/backend/internal/models"
	"shutterdev/backend/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type PhotoHandler struct {
	DB        *sql.DB
	R2Service *services.R2Service
}

func NewPhotoHandler(db *sql.DB, r2 *services.R2Service) *PhotoHandler {
	return &PhotoHandler{
		DB:        db,
		R2Service: r2,
	}
}

// GET /api/photos
func (h *PhotoHandler) GetAllPhotos(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	photos, err := database.GetAllPhotos(h.DB, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch photos"})
		return
	}

	c.JSON(http.StatusOK, photos)
}

// GET /api/photos?id=
func (h *PhotoHandler) GetPhotoByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Photo ID"})
		return
	}

	photo, err := database.GetPhotoByID(h.DB, id)
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

// POST /api/admin/photos
func (h *PhotoHandler) UploadPhoto(c *gin.Context) {
	photoHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No 'image' file was uploaded in the request body"})
		return
	}
	file, err := photoHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error opening the uploaded photo"})
		return
	}
	defer file.Close()

	title := c.PostForm("title")
	desc := c.PostForm("description")
	tagsStr := c.PostForm("tags")

	webImage, thumbImage, exifData, err := services.ProcessImage(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error in processing the image"})
		return
	}

	webFileName := services.GenerateUniqueFileName("web/", photoHeader.Filename)
	thumbFileName := services.GenerateUniqueFileName("thumbnails/", photoHeader.Filename)

	ctx := c.Request.Context()

	webURL, err := h.R2Service.UploadFile(ctx, webFileName, webImage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not upload web image to R2 Bucket"})
		return
	}
	thumbURL, err := h.R2Service.UploadFile(ctx, thumbFileName, thumbImage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not upload thumb image to R2 Bucket"})
		return
	}

	var tags []models.Tag
	tagNames := strings.Split(tagsStr, ",")
	for _, name := range tagNames {
		if strings.TrimSpace(name) != "" {
			tags = append(tags, models.Tag{Name: strings.TrimSpace(name)})
		}
	}

	photoModel := &models.Photo{
		Title:        title,
		Description:  desc,
		ImageURL:     webURL,
		ThumbnailURL: thumbURL,
		Exif:         exifData,
		Tags:         tags,
		CreatedAt:    time.Now(),
	}

	photoID, err := database.CreatePhoto(h.DB, photoModel)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not add image to database"})
		log.Println(err)
		return
	}
	photoModel.ID = int(photoID)

	c.JSON(http.StatusCreated, photoModel)
}

// PUT /api/admin/photos?id=
func (h *PhotoHandler) UpdatePhoto(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid photo ID"})
		return
	}

	var input struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}

	// put the json body into the input struct
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON data: " + err.Error()})
		return
	}

	dbErr := database.UpdatePhoto(h.DB, id, input.Title, input.Description)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while updating photo in database"})
		log.Println(dbErr)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Photo updated successfully"})
}

// DELETE /api/admin/photos?id=
func (h *PhotoHandler) DeletePhoto(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid photo ID"})
		return
	}

	photo, err := database.GetPhotoByID(h.DB, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch photo for deletion"})
		return
	}
	if photo == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Photo not found"})
		return
	}

	webKey, err := getKeyFromURL(photo.ImageURL)
	if err != nil {
		log.Printf("[WARNING]: Could not parse webKey from URL: %s", photo.ImageURL)
	}
	thumbKey, err := getKeyFromURL(photo.ThumbnailURL)
	if err != nil {
		log.Printf("[WARNING]: Could not parse thumbKey from URL: %s", photo.ThumbnailURL)
	}

	ctx := c.Request.Context()

	if webKey != "" {
		if err := h.R2Service.DeleteFile(ctx, webKey); err != nil {
			log.Printf("[ERROR]: Failed to delete web file from R2: %s", webKey)
		}
	}
	if thumbKey != "" {
		if err := h.R2Service.DeleteFile(ctx, thumbKey); err != nil {
			log.Printf("[ERROR]: Failed to delete thumbnail from R2: %s", thumbKey)
		}
	}

	dbErr := database.DeletePhoto(h.DB, id)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while deleting photo from database"})
		log.Println(dbErr)
		return
	}

	c.JSON(http.StatusOK, gin.H{"error": "Photo deleted successfully"})
}

func getKeyFromURL(fileURL string) (string, error) {
	parsedURL, err := url.Parse(fileURL)
	if err != nil {
		return "", err
	}

	return path.Clean(parsedURL.Path), nil
}
