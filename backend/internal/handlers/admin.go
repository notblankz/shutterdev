package handlers

import (
	"log"
	"net/http"
	"os"
	"shutterdev/backend/internal/auth"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// POST /api/admin/login
func (h *PhotoHandler) LoginAdmin(c *gin.Context) {
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

	tokenString, err := auth.GenerateToken()
	if err != nil {
		log.Printf("[LOGIN:ERROR] An error occured while generating the JWT token - %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "An error occured while generating the JWT token"})
		return
	}

	c.SetCookieData(&http.Cookie{
		Name:   "auth_token",
		Value:  tokenString,
		Path:   "/",
		Domain: ".aahansharma.dev",
		SameSite: func() http.SameSite {
			if os.Getenv("GIN_MODE") == "debug" {
				return http.SameSiteNoneMode
			} else {
				return http.SameSiteStrictMode
			}
		}(),
		Secure:   true,
		HttpOnly: true,
		MaxAge:   60 * 60 * 2,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged in"})
}

// GET /api/admin/me
func (h *PhotoHandler) CheckAdmin(c *gin.Context) {
	tokenString, err := c.Cookie("auth_token")

	if err != nil {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("[AUTH] No JWT token received")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing JWT auth token"})
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			log.Println("[AUTH] Malformed JWT Token received")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header must be of the form Bearer <token>"})
			return
		}

		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	}

	authorised, err := auth.VerifyToken(tokenString)
	if err != nil || !authorised {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not authorised to access this resource"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"role":          "admin",
	})
}
