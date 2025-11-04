package database

import (
	"bytes"
	"database/sql"
	"shutterdev/backend/internal/models"
	"sort"
)

func CreatePhoto(db *sql.DB, photo *models.Photo) (int64, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO photos (title, description, image_url, thumbnail_url, aperture, shutter_speed, iso, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	res, err := stmt.Exec(
		photo.Title,
		photo.Description,
		photo.ImageURL,
		photo.ThumbnailURL,
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
		SELECT id, title, description, image_url, thumbnail_url, aperture, shutter_speed, iso, created_at
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
		&photo.Title,
		&photo.Description,
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

func GetAllPhotos(db *sql.DB, limit, offset int) ([]models.Photo, error) {
	//  Query the Photos table to get the next set of photos (pagination is implemented via the Offset and Limit)
	selectAllPhotos := `
	SELECT id, title, description, image_url, thumbnail_url, aperture, shutter_speed, iso, created_at
	FROM Photos
	ORDER BY created_at DESC
	LIMIT ? OFFSET ?`

	rows, err := db.Query(selectAllPhotos, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	photosMap := make(map[int]*models.Photo)
	var photoIDs []interface{}

	// add the received rows as an entry in the Map with the skeleton -> photoID: &models.Photo <- This is a pointer so that we can make changes
	for rows.Next() {
		var photo models.Photo
		err := rows.Scan(
			&photo.ID,
			&photo.Title,
			&photo.Description,
			&photo.ImageURL,
			&photo.ThumbnailURL,
			&photo.Exif.Aperture,
			&photo.Exif.ShutterSpeed,
			&photo.Exif.ISO,
			&photo.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		// create an empty tag field
		photo.Tags = []models.Tag{}
		// put the key-value pair in the map
		photosMap[photo.ID] = &photo
		// append the photoID in the photoID slice
		photoIDs = append(photoIDs, photo.ID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// no photos exist
	if len(photoIDs) == 0 {
		return []models.Photo{}, nil
	}

	// Query for all associated tags
	// join the two tables and get only the tags of the photos in photoID (this allows for pagination)
	selectAllTags := `
	SELECT pt.photo_id, t.id, t.name
	FROM tags t INNER JOIN photo_tags pt ON t.id = pt.tag_id
	WHERE pt.photo_id IN (?` + string(bytes.Repeat([]byte(",?"), len(photoIDs)-1)) + `)
	`

	tagRows, err := db.Query(selectAllTags, photoIDs...)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()

	for tagRows.Next() {
		var tag models.Tag
		var photoID int
		// put each row into a tag struct
		err := tagRows.Scan(&photoID, &tag.ID, &tag.Name)
		if err != nil {
			return nil, err
		}
		// check if the photoID exists in the map
		photo, ok := photosMap[photoID]
		if ok {
			// open the photo struct from the map and put append the tag into the tags of the photo
			// Note: since our map has pointer to the struct as the value, any changes made to the struct will be reflected forever
			photo.Tags = append(photo.Tags, tag)
		}
	}

	if err = tagRows.Err(); err != nil {
		return nil, err
	}

	// photoMaps looks like this -> {1: 67583, 2: 584930} coz the format was {photoID: &models.Photo (a pointer)}
	// this map is useless to the frontend since it cannot get any information from the pointers
	// convert the map into a slice with each photo -> [{ID: 101, Title: "Bengaluru Palace", ...}, {ID: 102, Title: "Cubbon Park", ...}]
	// create the slice
	photosSlice := make([]models.Photo, 0, len(photosMap))
	for _, photo := range photosMap {
		// derefernce the photo struct and append to the slice
		photosSlice = append(photosSlice, *photo)
	}

	// sort the slice back to maintain the initial DESC order
	// idk how it works, generated by GPT
	sort.Slice(photosSlice, func(i, j int) bool {
		return photosSlice[i].CreatedAt.After(photosSlice[j].CreatedAt)
	})

	return photosSlice, nil

}

func UpdatePhoto(db *sql.DB, photoID int, title, description string) error {
	updatePhoto := `UPDATE photos SET title = ?, description = ? WHERE id = ?`

	_, err := db.Exec(updatePhoto, title, description, photoID)
	if err != nil {
		return err
	}

	return nil
}
