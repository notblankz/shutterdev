// root path

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Masonry from '@mui/lab/Masonry';
import { useRouter } from "next/navigation";

const LIMIT = 20
const shimmer = (w, h) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#333" offset="20%" />
      <stop stop-color="#222" offset="50%" />
      <stop stop-color="#333" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#333" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str) =>
    typeof window === "undefined"
        ? Buffer.from(str).toString("base64")
        : window.btoa(str);

export default function TestGalleryPage() {

    const [offset, setOffset] = useState(0);
    const [photos, setPhotos] = useState([]);
    const router = useRouter()

    useEffect(() => {
        async function fetchData() {
            const t0 = performance.now()
            console.log("Page mounted at:", (t0 / 1000).toFixed(3), "s");

            try {
                var offset = 0
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos?limit=${LIMIT}&offset=${offset}`, {
                    method: "GET",
                })
                if (!res.ok) {
                    const err = await res.json()
                    console.log(err)
                }
                const photos = await res.json()
                setPhotos(photos)
                return photos
            } catch (e) {
                console.log(e)
            }
        }
        fetchData()
    }, []);


    return (
        // TOOD: implement pagination
        <div className="flex justify-center items-center px-40 py-10">
            {/* TODO: make masonry responsive */}
            <Masonry columns={3} spacing={2}>
                {photos.map((photo) => (
                    <Image
                        key={photo.id}
                        src={photo.thumbnailUrl}
                        width={photo.thumbWidth}
                        height={photo.thumbHeight}
                        alt="photo by photographer" // TODO: add description as alt text
                        className="rounded-md"
                        placeholder={`data:image/svg+xml;base64,${toBase64(shimmer(photo.thumbWidth, photo.thumbHeight))}`}
                        preload={true}
                        unoptimized // TODO: check perf diff between unoptimised and optimised
                        onClick={() => router.push(`/photos/${photo.id}`, {scroll: false})}
                    />
                ))}
            </Masonry>
        </div>

    )
}
