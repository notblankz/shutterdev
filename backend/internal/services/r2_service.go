// upload both the resized images to the R2 bucket and return the public URL
package services

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// R2Service holds the configured S3 client and bucket info for R2.
type R2Service struct {
	Client     *s3.Client
	BucketName string
	PublicURL  string
}

// NewR2Service creates and configures a new R2 client.
// It takes the configuration values from the environment.
func NewR2Service(accountID, accessKey, secretKey, publicURL, bucketName string) (*R2Service, error) {

	// 1. Create the R2 endpoint URL
	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	// 2. Create the static credentials provider
	creds := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")

	// 3. Load the default AWS configuration, and then override it.
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(creds),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// 4. Create the S3 client, using the non-deprecated method
	// of setting the BaseEndpoint in the options.
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	// 5. Return our new service struct
	return &R2Service{
		Client:     s3Client,
		BucketName: bucketName,
		PublicURL:  publicURL,
	}, nil
}

// UploadFile uploads a file's data to the R2 bucket and returns its public URL.
func (s *R2Service) UploadFile(ctx context.Context, fileName string, data []byte) (string, error) {
	body := bytes.NewReader(data)

	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.BucketName),
		Key:         aws.String(fileName),
		Body:        body,
		ContentType: aws.String("image/jpeg"),
	}

	_, err := s.Client.PutObject(ctx, input)
	if err != nil {
		return "", fmt.Errorf("failed to upload file to R2: %w", err)
	}

	publicURL := fmt.Sprintf("%s/%s", s.PublicURL, fileName)
	return publicURL, nil
}

// DeleteFile removes a file from the R2 bucket.
// This function is perfect, no changes needed.
func (s *R2Service) DeleteFile(ctx context.Context, fileName string) error {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(s.BucketName),
		Key:    aws.String(fileName),
	}

	_, err := s.Client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete file from R2: %w", err)
	}

	return nil
}

// GenerateUniqueFileName creates a unique name while preserving the file extension.
// This function is perfect, no changes needed.
func GenerateUniqueFileName(basePath, originalName string) string {
	// We'll use the original extension, but a UUID for the name.
	// We can use the originalName to get the extension.
	ext := filepath.Ext(originalName)
	if ext == "" {
		ext = ".jpg"
	}

	id := uuid.New().String()

	// Add some structure for better organization in your bucket
	timestamp := time.Now().Format("2006/01/02")
	return fmt.Sprintf("%s/%s/%s%s", basePath, timestamp, id, ext)
}
