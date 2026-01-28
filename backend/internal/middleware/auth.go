package middleware

import (
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
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing auth token"})
				return
			}

			if !strings.HasPrefix(authHeader, "Bearer ") {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header must be in the format Bearer <token>"})
				return
			}

			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		authorised, err := auth.VerifyToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or Expired Token received"})
			return
		}
		if !authorised {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Not authorised to access this protected resource"})
			return
		}

		c.Next()
	}
}
