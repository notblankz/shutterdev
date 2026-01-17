package models

import "time"

type Exif struct {
	ShutterSpeed string `json:"shutterSpeed"`
	Aperture     string `json:"aperture"`
	ISO          string `json:"iso"`
}

type Photo struct {
	ID           string    `json:"id"`
	ImageURL     string    `json:"imageUrl"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	ThumbWidth   int       `json:"thumbWidth"`
	ThumbHeight  int       `json:"thumbHeight"`
	Exif         Exif      `json:"exif"`
	Tags         []Tag     `json:"tags"`
	CreatedAt    time.Time `json:"createdAt"`
}

type ThumbnailPhoto struct {
	ID           string    `json:"id"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	ThumbWidth   int       `json:"thumbWidth"`
	ThumbHeight  int       `json:"thumbHeight"`
	CreatedAt    time.Time `json:"created_at"`
}

type Cursor struct {
	CreatedAt time.Time `json:"created_at"`
	ID        string    `json:"id"`
}
