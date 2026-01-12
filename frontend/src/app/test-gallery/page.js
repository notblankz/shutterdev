//"/test-gallery"

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

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

function ImageCard({index, src, width, height}) {
    const [loaded, setLoaded] = useState(false)

    return (
        <div key={index} className="mb-4 break-inside-avoid">
            {!loaded && <Skeleton className={`rounded-md h-${height}px w-${width}px`}/>}
            {/* check performance difference between preload and priority loading */}
            <Image
                src={src}
                width={width}
                height={height}
                alt="photo by photographer" // TODO: add description as alt text
                className="rounded-md"
                // priority={index < 6}
                placeholder={`data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`}
                onLoadingComplete={() => setLoaded(true)}
                preload={true}
                unoptimized // TODO: check perf diff between unoptimised and optimised
            />
        </div>
    )
}

// TODO: Convert each image into it's own Component so that we can try to implement skeletons
export default function TestGalleryPage() {

    const [offset, setOffset] = useState(0);
    const [photos, setPhotos] = useState([]);

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
            } catch(e) {
                console.log(e)
            }
        }
        fetchData()
    }, []);


    return (
        // TOOD: implement pagination
        <div className="flex justify-center items-center px-40 py-10">
            <div className="columns-2 md:columns-3 gap-4">
                {photos.map((photo, index) => (
                    <ImageCard key={photo.id} index={index} src={photo.thumbnailUrl} width={photo.thumbWidth} height={photo.thumbHeight}/>
                ))}
            </div>
        </div>

    )
}
