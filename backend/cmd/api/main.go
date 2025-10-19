package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"shutterdev/backend/internal/database"
)

func main() {
	fmt.Println("Starting server...")
	r := gin.Default()

	db := database.InitDB("shutterdev.db")
	defer db.Close()

	r.GET("/", func(c *gin.Context) {
		// Return JSON response
		c.JSON(http.StatusOK, gin.H{
			"message": "databaase working",
		})
	})

	r.Run()
}
