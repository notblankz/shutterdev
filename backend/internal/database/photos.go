package database

import (
	"database/sql"
	"shutterdev/backend/internal/models"
)

func CreatePhoto(db *sql.DB, photo *models.Photo) (int64, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO photos (image_url, thumbnail_url, thumbnail_width, thumbnail_height, aperture, shutter_speed, iso, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	res, err := stmt.Exec(
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
		return 0, err
	}

	photoID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	for _, tag := range photo.Tags {
		var tagID int64
		err := tx.QueryRow("SELECT id FROM tags WHERE name = ?", tag.Name).Scan(&tagID)
		if err == sql.ErrNoRows {
			// Tag doesn't exist, so create it
			tagStmt, err := tx.Prepare("INSERT INTO tags (name) VALUES (?)")
			if err != nil {
				return 0, err // Can't prepare the statement
			}
			// Defer close inside the loop for safety
			defer tagStmt.Close()

			tagRes, err := tagStmt.Exec(tag.Name)
			if err != nil {
				return 0, err
			}

			// THE FIX IS HERE: Use `=` to assign to the existing tagID
			tagID, err = tagRes.LastInsertId()
			if err != nil {
				return 0, err
			}

		} else if err != nil {
			// A different, unexpected error occurred
			return 0, err
		}

		// Now, link the photo and the tag
		_, err = tx.Exec("INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)", photoID, tagID)
		if err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return photoID, nil
}

func GetPhotoByID(db *sql.DB, id int) (*models.Photo, error) {
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

func GetAllPhotos(db *sql.DB, limit, offset int) ([]models.ThumbnailPhoto, error) {
	//  Query the Photos table to get the next set of photos (pagination is implemented via the Offset and Limit)
	selectAllPhotos := `
	SELECT id, thumbnail_url, thumbnail_width, thumbnail_height
	FROM Photos
	ORDER BY created_at DESC
	LIMIT ? OFFSET ?`

	rows, err := db.Query(selectAllPhotos, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	photoSlice := make([]models.ThumbnailPhoto, 0, limit)

	// add the received rows as an entry in the Map with the skeleton -> photoID: &models.Photo <- This is a pointer so that we can make changes
	for rows.Next() {
		var photoThumbnail models.ThumbnailPhoto
		err := rows.Scan(
			&photoThumbnail.ID,
			&photoThumbnail.ThumbnailURL,
			&photoThumbnail.ThumbWidth,
			&photoThumbnail.ThumbHeight,
		)
		if err != nil {
			return nil, err
		}
		// append the models.Photo to the photoSlice
		photoSlice = append(photoSlice, photoThumbnail)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return photoSlice, nil

}

func DeletePhoto(db *sql.DB, photoID int) error {
	// remove the photoID from the photo_tags table
	// finally remove the photoID row from photos table
	// perform all this in a transaction to either delete both or delete none
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	removePhotoTags := `DELETE FROM photo_tags WHERE photo_id = ?`
	_, photoTagsErr := tx.Exec(removePhotoTags, photoID)
	if photoTagsErr != nil {
		return photoTagsErr
	}

	removePhoto := `DELETE FROM photos WHERE id = ?`
	_, photoErr := tx.Exec(removePhoto, photoID)
	if photoErr != nil {
		return photoErr
	}

	// tx.Commit() itself returns an error if anything goes wrong
	// if nothing goes wrong and everything is commited it is nil thats why we return tx.Commit()
	return tx.Commit()
}
