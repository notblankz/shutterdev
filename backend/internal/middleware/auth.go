package middleware

import (
	"log"
	"net/http"
	"shutterdev/backend/internal/auth"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		tokenString, err := c.Cookie("auth_token")

		if err != nil {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				log.Println("[MIDDLEWARE] Received Empty Auth Header")
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing auth token"})
				return
			}

			if !strings.HasPrefix(authHeader, "Bearer ") {
				log.Println("[MIDDLEWARE] Received Bad Auth Header")
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header must be in the format Bearer <token>"})
				return
			}

			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		authorised, err := auth.VerifyToken(tokenString)
		if err != nil {
			log.Printf("[MIDDLEWARE] Error in verifying JWT Token - %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or Expired Token received"})
			return
		}
		if !authorised {
			log.Println("[MIDDLEWARE] Not Authorised to Access")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Not authorised to access this protected resource"})
			return
		}

		c.Next()
	}
}
