package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken() (string, error) {
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

func VerifyToken(tokenString string) (bool, error) {
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
