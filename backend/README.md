# ShutterDev API Backend

This is the complete Go (Gin) backend for the ShutterDev photo gallery. It handles image processing, secure file storage, database management, and provides a protected JSON API for a frontend client.

---

### Tech Stack

* **`gin`:** Web framework
* **`modernc.org/sqlite`**: Pure Go SQLite driver (no CGO required)
* **`Cloudflare R2`:** S3-compatible object storage for images
* **`aws-sdk-go-v2`**: Used to communicate with the R2 API
* **`goexif`**: For EXIF metadata extraction
* **`resize`**: For image resizing
* **`air`**: For live reloading during development
* **`godotenv`**: For managing environment variables

---

### Setup & Installation

1.  **Clone the Repository:**
    ```bash
    git clone ...
    cd shutterdev/backend
    ```

2.  **Install Dependencies:**
    This will install all necessary Go modules listed in `go.mod`.
    ```bash
    go mod tidy
    ```

3.  **Set Up Environment Variables:**
    Create a file named `.env` in the `backend/` directory. Use the template below and fill in your secret keys.

4.  **Run the Server:**
    * **For Development (with live-reload):**
        ```bash
        air
        ```
    * **For Production/Manual Run:**
        ```bash
        go run ./cmd/api
        ```

    The server will start on `http://localhost:8080`.

---

### Configuration (`.env` File)

Your local `.env` file should be placed in the `backend/` root and follow this format.

```env
R2_ACCOUNT_ID="<your-account-id>"
R2_ACCESS_KEY_ID="<your-r2-access-key-id>"
R2_SECRET_ACCESS_KEY="<your-r2-secret-access-key>"
R2_BUCKET_PUBLIC_URL="<your-public-bucket-url>"
R2_BUCKET_NAME="shutterdev-assets"
ADMIN_SECRET_KEY="<your-own-secret-key-e.g.-shutterdev_abc123>"
```
---

## API Endpoints

All endpoints are prefixed with `/api`.

| Method | Endpoint           | Protected | Description                                                                                      |
|--------|---------------------|------------|--------------------------------------------------------------------------------------------------|
| GET    | /photos            | False         | Gets a paginated list of all photos. Supports `?limit=20` and `?offset=0` query parameters.     |
| GET    | /photos/:id        | False         | Gets all details for a single photo by its `id`.                                                 |
| POST   | /admin/photos      | True        | Uploads a new photo. Uses `multipart/form-data` and expects fields: `image`, `title`, `description`, `tags`. |
| PUT    | /admin/photos/:id  | True        | Updates a photo's `title` and `description`. Expects a JSON body: `{"title": "...", "description": "..."}`. |
| DELETE | /admin/photos/:id  | True        | Deletes a photo's R2 files and database record.                                                   |
