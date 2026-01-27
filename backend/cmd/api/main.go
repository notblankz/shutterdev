package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rwcarlsen/goexif/exif"
	"github.com/rwcarlsen/goexif/mknote"

	"shutterdev/backend/internal/database"
	"shutterdev/backend/internal/handlers"
	"shutterdev/backend/internal/services"
)

func main() {

	envErr := godotenv.Load(".env")
	if envErr != nil {
		log.Println("[ERROR] Could not load .env file", envErr)
	}

	if os.Getenv("ADMIN_PASSWORD_HASH") == "" {
		log.Fatal("[FATAL] ADMIN_PASSWORD_HASH missing from .env")
	} else if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("[FATAL] JWT_SECRET missing from .env")
	}

	gin.SetMode(os.Getenv("GIN_MODE"))

	fmt.Printf("[%s] Starting server...\n\n", gin.Mode())
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{os.Getenv("NEXT_APP_PUBLIC_URL")},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.SetTrustedProxies(nil)

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

	exif.RegisterParsers(mknote.All...)

	photoHandler := handlers.NewPhotoHandler(DB, R2Service)

	userApiKey := os.Getenv("ADMIN_SECRET_KEY")
	handlers.RegisterRoutes(r, photoHandler, userApiKey)

	r.Run()
}
