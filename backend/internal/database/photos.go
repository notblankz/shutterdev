package database

import (
	"database/sql"
	"shutterdev/backend/internal/models"
	"time"

	"github.com/google/uuid"
)

type PhotosResponse struct {
	Photos     []models.ThumbnailPhoto `json:"photos"`
	NextCursor models.Cursor           `json:"nextCursor"`
	HasMore    bool                    `json:"hasMore"`
}

func CreatePhoto(db *sql.DB, photo *models.Photo) (string, error) {
	tx, err := db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO photos (id, image_url, thumbnail_url, thumbnail_width, thumbnail_height, aperture, shutter_speed, iso, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return "", err
	}
	defer stmt.Close()

	id := uuid.New()
	_, err = stmt.Exec(
		id.String(),
		photo.ImageURL,
		photo.ThumbnailURL,
		photo.ThumbWidth,
		photo.ThumbHeight,
		photo.Exif.Aperture,
		photo.Exif.ShutterSpeed,
		photo.Exif.ISO,
		photo.CreatedAt,
	)
	if err != nil {
		return "", err
	}

	// photoID, err := res.LastInsertId()
	// if err != nil {
	// 	return 0, err
	// }

	for _, tag := range photo.Tags {
		var tagID int64
		err := tx.QueryRow("SELECT id FROM tags WHERE name = ?", tag.Name).Scan(&tagID)
		if err == sql.ErrNoRows {
			// Tag doesn't exist, so create it
			tagStmt, err := tx.Prepare("INSERT INTO tags (name) VALUES (?)")
			if err != nil {
				return "", err // Can't prepare the statement
			}
			// Defer close inside the loop for safety
			defer tagStmt.Close()

			tagRes, err := tagStmt.Exec(tag.Name)
			if err != nil {
				return "", err
			}

			tagID, err = tagRes.LastInsertId()
			if err != nil {
				return "", err
			}

		} else if err != nil {
			// A different, unexpected error occurred
			return "", err
		}

		// Now, link the photo and the tag
		_, err = tx.Exec("INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)", id.String(), tagID)
		if err != nil {
			return "", err
		}
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}

	return id.String(), nil
}

func GetPhotoByID(db *sql.DB, id string) (*models.Photo, error) {
	// SQL to get all the information of the Photo
	selectPhotoSQL := `
		SELECT id, image_url, thumbnail_url, aperture, shutter_speed, iso, created_at
		FROM photos
		WHERE id = ?
	`
	// query the db and store it in row
	row := db.QueryRow(selectPhotoSQL, id)

	// placeholder to hold the returned rows
	var photo models.Photo

	// put the row that we got back from the db into the above placeholder
	err := row.Scan(
		&photo.ID,
		&photo.ImageURL,
		&photo.ThumbnailURL,
		&photo.Exif.Aperture,
		&photo.Exif.ShutterSpeed,
		&photo.Exif.ISO,
		&photo.CreatedAt,
	)
	// if sql returns a ErrNoRows variable meaning no rows exist
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil { // if there are some other errors return that
		return nil, err
	}

	// join the two tables, photo_tags and tags with the common row (tag_id) so that we can get all the tags for the specific photo
	selectTagsSQL := `SELECT t.id, t.name FROM tags t INNER JOIN photo_tags pt ON t.id = pt.tag_id WHERE pt.photo_id = ?`

	// query the database
	rows, err := db.Query(selectTagsSQL, id)
	if err != nil {
		return nil, err
	}

	// close the connection so that db resources are freed
	defer rows.Close()

	// iterate through the rows using rows.Next
	for rows.Next() {
		// placeholder for every tag
		var tag models.Tag
		// put the tag that we just got into tag.ID and tag.Name
		err := rows.Scan(&tag.ID, &tag.Name)
		if err != nil {
			return nil, err
		}
		// append to the final photo struct
		photo.Tags = append(photo.Tags, tag)
	}

	// checks if rows.Next() terminated properly
	err = rows.Err()
	if err != nil {
		return nil, err
	}

	// return the final photo struct
	return &photo, nil
}

func GetAllPhotos(db *sql.DB, createdAt time.Time, id string, LIMIT int) (PhotosResponse, error) {

	var response PhotosResponse
	var rows *sql.Rows
	var err error
	var selectAllPhotos string
	if createdAt.IsZero() {
		selectAllPhotos = `
		SELECT id, thumbnail_url, thumbnail_width, thumbnail_height, created_at
		FROM Photos
		ORDER BY created_at DESC
		LIMIT ?`
		rows, err = db.Query(selectAllPhotos, LIMIT)
		if err != nil {
			return PhotosResponse{}, err
		}
		defer rows.Close()
	} else {
		selectAllPhotos = `
		SELECT id, thumbnail_url, thumbnail_width, thumbnail_height, created_at
		FROM Photos
		WHERE (created_at < ?) OR (created_at = ? AND id < ?)
		ORDER BY created_at DESC, id DESC
		LIMIT ?`
		rows, err = db.Query(selectAllPhotos, createdAt, createdAt, id, LIMIT)
		if err != nil {
			return PhotosResponse{}, err
		}
		defer rows.Close()
	}

	photoSlice := make([]models.ThumbnailPhoto, 0, LIMIT)

	for rows.Next() {
		var photoThumbnail models.ThumbnailPhoto
		err := rows.Scan(
			&photoThumbnail.ID,
			&photoThumbnail.ThumbnailURL,
			&photoThumbnail.ThumbWidth,
			&photoThumbnail.ThumbHeight,
			&photoThumbnail.CreatedAt,
		)
		if err != nil {
			return PhotosResponse{}, err
		}
		// append the models.Photo to the photoSlice
		photoSlice = append(photoSlice, photoThumbnail)
	}

	if err := rows.Err(); err != nil {
		return PhotosResponse{}, err
	}

	response.Photos = photoSlice

	if len(photoSlice) > 0 {
		last := photoSlice[len(photoSlice)-1]
		response.NextCursor = models.Cursor{
			ID:        last.ID,
			CreatedAt: last.CreatedAt,
		}
	}

	response.HasMore = (len(photoSlice) == LIMIT)

	return response, nil

}
