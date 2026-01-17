// root path

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Masonry from '@mui/lab/Masonry';
import { useRouter } from "next/navigation";
import { useInView } from "react-intersection-observer";
import { Spinner } from "@/components/ui/spinner";

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

async function fetchNextPage(cursor) {
    try {
        var requestLink = process.env.NEXT_PUBLIC_API_URL + (cursor ? `/api/photos?cursor=${btoa(JSON.stringify(cursor))}` : "/api/photos")
        const res = await fetch(requestLink, {method: "GET"})
        if (!res.ok) {
            const err = await res.json()
            console.log(err)
        }
        const page = await res.json()
        return page
    } catch (e) {
        console.log(e)
    }
}

export default function TestGalleryPage() {

    const [initialized, setInitialized] = useState(false)
    const [photos, setPhotos] = useState([]);
    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const [inViewRef, inView] = useInView()

    useEffect(() => {
        let cancelled = false
        async function loadInitialPage() {
            const page = await fetchNextPage(null)
            if (cancelled || !page) return
            setPhotos(page.photos)
            setCursor(page.nextCursor)
            setHasMore(page.hasMore)
            setInitialized(true)
        }
        loadInitialPage()

        // cleanup function
        return () => {
            cancelled = true
        }
    }, []);

    useEffect(() => {
        if (inView && hasMore && !loading) {
            async function loadNextPage() {
                setLoading(true)
                const page = await fetchNextPage(cursor)
                setPhotos(prev => [...prev, ...page.photos])
                setCursor(page.nextCursor)
                setHasMore(page.hasMore)
                setLoading(false)
            }
            loadNextPage()
        }
    }, [inView, cursor, hasMore])


    return (
        // TOOD: implement pagination
        <div className="flex flex-col px-40 py-10 w-full">
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
            {initialized && hasMore && !loading && <Spinner ref={inViewRef} className="mt-8 size-6"/>}
        </div>

    )
}
