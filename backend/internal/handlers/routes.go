package handlers

import (
	"shutterdev/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.Engine, h *PhotoHandler, userApiKey string) {
	api := router.Group("/api")
	{
		api.GET("/photos", h.GetAllPhotos)
		api.GET("/photos/:id", h.GetPhotoByID)
		admin := api.Group("/admin")
		{
			admin.Use(middleware.AuthMiddleware(userApiKey))
			admin.POST("/photos", h.UploadPhoto)
			admin.DELETE("/photos", h.DeletePhoto)
			admin.DELETE("/photos/failed", h.NukeFailedBlobs)
		}
	}
}
