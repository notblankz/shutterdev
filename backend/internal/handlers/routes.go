package handlers

import "github.com/gin-gonic/gin"

func RegisterRoutes(router *gin.Engine, h *PhotoHandler) {
	api := router.Group("/api")
	{
		api.GET("/photos", h.GetAllPhotos)
		api.GET("/photos/:id", h.GetPhotoByID)
		admin := api.Group("/admin")
		{
			admin.POST("/photos", h.UploadPhoto)
			admin.PUT("/photos/:id", h.UpdatePhoto)
			admin.DELETE("/photos/:id", h.DeletePhoto)
		}
	}
}
