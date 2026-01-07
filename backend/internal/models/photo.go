package models

import "time"

type Exif struct {
	ShutterSpeed string `json:"shutterSpeed"`
	Aperture     string `json:"aperture"`
	ISO          string `json:"iso"`
}

type Photo struct {
	ID           int       `json:"id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	ImageURL     string    `json:"imageUrl"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	ThumbWidth   int       `json:"thumbWidth"`
	ThumbHeight  int       `json:"thumbHeight"`
	Exif         Exif      `json:"exif"`
	Tags         []Tag     `json:"tags"`
	CreatedAt    time.Time `json:"createdAt"`
}


type ThumbnailPhoto struct {
	ID           int       `json:"id"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	ThumbWidth   int       `json:"thumbWidth"`
	ThumbHeight  int       `json:"thumbHeight"`
}
