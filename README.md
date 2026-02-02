# ShutterDev

A self-hosted photo gallery with admin dashboard for uploading, processing, and serving images

This project allows an admin user to upload photos, automatically processes them into multiple sizes, stores metadata (including EXIF), and serves them publicly via a gallery API with a beautiful frontend

---

## Architecture

![Architecture Diagram](/docs/updated-shutterdev-architecture.svg)

**High-level flow:**

1. Frontend (Next.js) sends upload requests
    - The EXIF is extracted on the client
    - The Image is then resized to `1440px` on the longest side and covert to `WebP`
2. Backend (Go + Gin) processes each image:
   - Validates file type
   - Resize image to thumbnail version
   - Uploads images to R2
   - Stores metadata and R2 Public URL in database
3. Public API serves image metadata and URLs

---

## Performance
Test Environment:
- Backed: Running on Old Laptop connected through cloudflare tunnel with 200Mbps internet speed
- Frontend: Vercel
- Tested with 20 batch of 15 images each round and got an average upload time of 0.914375s Per Image

## Performance

#### Test Environment

- Backend: Hosted on an older personal laptop exposed via a Cloudflare Tunnel (~200 Mbps connection)
- Frontend: Deployed on Vercel

#### Methodology
Uploads were evaluated using `20 batches of 15 images each (300 images total)`, with individual image sizes ranging from `8 MB to 16 MB`
**The system achieved an average upload time of `0.914 seconds` per image under these conditions**

> Despite operating on constrained hardware and handling large image payloads, the system consistently maintained sub-second average upload times per image

---

### Setup & Run Locally

> **Environment Variables**
> Both frontend and backend require environment variables.
> Examples of each can be found at:
> - `backend/.env.example`
> - `frontend/.env.example`

##### 1. Clone the repository

```bash
git clone https://github.com/notblankz/shutterdev.git
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

### Self-Hosting
This project is fully self-hostable, similar to the demo deployment at [images.aahansharma.dev](images.aahansharma.dev) has been hosted
- The backend is running on an Old System with a cloudflare tunnel connected to it with a domain
- The frontend can be hosted on Vercel's free tier with good enough performance
- Cloudflare's R2 can be used as the Object Storage as it provides 1 Million Requests and 10GB of data every month

---

## License

This project is open-source and available under the MIT License
