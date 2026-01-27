package handlers

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// POST /api/admin/login
func LoginAdmin(c *gin.Context) {
	type LoginRequest struct {
		Password string `json:"password"`
	}
	var lr LoginRequest
	if err := c.ShouldBindJSON(&lr); err != nil {
		log.Printf("[LOGIN:ERROR] Bind failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	err := bcrypt.CompareHashAndPassword([]byte(os.Getenv("ADMIN_PASSWORD_HASH")), []byte(lr.Password))
	if err != nil {
		log.Println("[UNAUTHORISED] Password is incorrect hence the user is not authorised")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not authorised to access this resource"})
		return
	}

	tokenString, err := generateToken()
	if err != nil {
		log.Printf("[LOGIN:ERROR] An error occured while generating the JWT token - %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "An error occured while generating the JWT token"})
		return
	}

	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("auth_token", tokenString, 0, "", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged in"})
}

// <== helper functions ==>
func generateToken() (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  "admin",
		"role": "admin",
		"exp":  time.Now().Add(2 * time.Hour).Unix(),
	})
	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}
