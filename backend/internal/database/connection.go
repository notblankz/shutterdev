package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

func InitDB(filepath string) *sql.DB {
	db, err := sql.Open("sqlite", filepath)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("[[DATABASE] Database connected successfully")

	_, err = db.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		log.Fatal(err)
	}

	createPhotosTableSQL := `CREATE TABLE IF NOT EXISTS photos (
		"id" TEXT NOT NULL PRIMARY KEY,
		"image_url" TEXT,
		"thumbnail_url" TEXT,
		"thumbnail_width" INT,
		"thumbnail_height" INT,
		"aperture" TEXT,
		"shutter_speed" TEXT,
		"iso" TEXT,
		"created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	createTagsTableSQL := `CREATE TABLE IF NOT EXISTS tags (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"name" TEXT UNIQUE
	);`

	createPhotoTagsTableSQL := `CREATE TABLE IF NOT EXISTS photo_tags (
		"photo_id" TEXT NOT NULL,
		"tag_id" INTEGER NOT NULL,
		FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE,
		FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE RESTRICT,
		PRIMARY KEY(photo_id, tag_id)
	);`

	createPhotoTagsTagIDIndex := `
		CREATE INDEX IF NOT EXISTS idx_photo_tags_tag_id
		ON photo_tags(tag_id);
		`

	createFailedDeleteStore := `CREATE TABLE IF NOT EXISTS failed_storage_deletes (
		"id" TEXT NOT NULL PRIMARY KEY,
		"web_url" TEXT,
		"thumbnail_url" TEXT
	)`

	log.Println("[DATABASE] Creating database tables...")
	_, err = db.Exec(createPhotosTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(createTagsTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(createPhotoTagsTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(createPhotoTagsTagIDIndex)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(createFailedDeleteStore)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("[DATABASE] Tables created successfully.")

	return db
}
