# ShutterDev

A self-hosted photo gallery and admin dashboard for uploading, processing, and serving images.

This project allows an admin user to upload photos, automatically processes them into multiple sizes, stores metadata (including EXIF), and serves them publicly via a gallery API.

---

## Architecture

![Architecture Diagram](/docs/shutterdev-architecture.svg)

**High-level flow:**

1. Frontend (Next.js) sends upload requests
2. Backend (Go + Gin) processes each image:
   - Validates file type
   - Extracts EXIF data
   - Generates resized versions
   - Uploads images to R2
   - Stores metadata in database
3. Public API serves image metadata and URLs

---

## Setup & Run Locally

##### 1. Clone the repository

```bash
git clone https://github.com/your-username/shutterdev.git
cd shutterdev
```
##### 2. Backend setup
```bash
cd backend
cp .env.example .env
```
Fill in .env with your own values.

Run the backend:
```bash
go run ./cmd/api
```
Backend runs on: `http://localhost:8080`

##### 3. Frontend setup
```bash
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```
Frontend runs on: `http://localhost:3000`

---
