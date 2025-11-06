package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization Header is empty"})
			return
		}

		hasBearer := strings.HasPrefix(authHeader, "Bearer ")
		if hasBearer {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == apiKey {
				c.Next()
			} else {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "You are not authorized to request to this path"})
				return
			}
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header must be in 'Bearer <token>' format"})
			return
		}
	}
}
