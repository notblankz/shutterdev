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
	log.Println("Database connected successfully")

	createPhotosTableSQL := `CREATE TABLE IF NOT EXISTS photos (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"title" TEXT,
		"description" TEXT,
		"image_url" TEXT,
		"thumbnail_url" TEXT,
		"aperture" TEXT,
		"shutter_speed" TEXT,
		"iso" INTEGER,
		"created_at" DATETIME
	);`

	createTagsTableSQL := `CREATE TABLE IF NOT EXISTS tags (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"name" TEXT UNIQUE
	);`

	createPhotoTagsTableSQL := `CREATE TABLE IF NOT EXISTS photo_tags (
		"photo_id" INTEGER,
		"tag_id" INTEGER,
		FOREIGN KEY(photo_id) REFERENCES photos(id),
		FOREIGN KEY(tag_id) REFERENCES tags(id),
		PRIMARY KEY(photo_id, tag_id)
	);`

	log.Println("Creating database tables...")
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
	log.Println("Tables created successfully.")

	return db
}
