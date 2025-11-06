package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"shutterdev/backend/internal/database"
	"shutterdev/backend/internal/handlers"
	"shutterdev/backend/internal/services"
)

func main() {

	envErr := godotenv.Load(".env")
	if envErr != nil {
		log.Println("[ERROR] Could not load .env file", envErr)
	}

	fmt.Println("Starting server...")
	r := gin.Default()

	r.Static("/public", "./public")
	r.StaticFile("/", "./public/index.html")

	DB := database.InitDB("shutterdev.db")
	defer DB.Close()

	R2Service, r2Err := services.NewR2Service(
		os.Getenv("R2_ACCOUNT_ID"),
		os.Getenv("R2_ACCESS_KEY_ID"),
		os.Getenv("R2_SECRET_ACCESS_KEY"),
		os.Getenv("R2_BUCKET_PUBLIC_URL"),
		os.Getenv("R2_BUCKET_NAME"),
	)
	if r2Err != nil {
		log.Println("[ERROR] Could not initialize R2 Service", r2Err)
	}

	photoHandler := handlers.NewPhotoHandler(DB, R2Service)

	userApiKey := os.Getenv("ADMIN_SECRET_KEY")
	handlers.RegisterRoutes(r, photoHandler, userApiKey)

	r.Run()
}
