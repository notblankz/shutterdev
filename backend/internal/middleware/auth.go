package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

		authorised, err := verifyToken(tokenString)
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

// <== Helper Functions ==>
func verifyToken(tokenString string) (bool, error) {
	secret := os.Getenv("JWT_SECRET")

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		signingMethod := t.Method.Alg()
		if signingMethod != "HS256" {
			return nil, errors.New("Wrong Signing Method recieved")
		}

		return []byte(secret), nil
	})

	if err != nil {
		return false, err
	}

	if !token.Valid {
		return false, errors.New("Invalid Token received")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false, errors.New("Token with Invalid Claims received")
	}

	if claims["role"] != "admin" {
		return false, errors.New("Not authorised as an admin")
	}

	return true, nil
}
