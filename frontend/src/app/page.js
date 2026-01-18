// root path

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Masonry from '@mui/lab/Masonry';
import { useRouter } from "next/navigation";
import InfiniteScroll from "react-infinite-scroll-component";
import { Spinner } from "@/components/ui/spinner";

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

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center gap-3 mt-8">
            <Spinner className="size-6 mt-1 text-neutral-600"/>
            <h1 className="text-2xl text-neutral-600">Loading...</h1>
        </div>
    )
}

export default function TestGalleryPage() {

    const [photos, setPhotos] = useState([]);
    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        let cancelled = false
        async function loadInitialPage() {
            const page = await fetchNextPage(null)
            if (cancelled || !page) return
            setPhotos(page.photos)
            setCursor(page.nextCursor)
            setHasMore(page.hasMore)
        }
        loadInitialPage()

        // cleanup function
        return () => {
            cancelled = true
        }
    }, []);

    async function loadNextPage() {
        if (loading || !hasMore) return;

        setLoading(true);

        const page = await fetchNextPage(cursor);
        if (!page) {
            setHasMore(false);
            setLoading(false);
            return;
        }

        setPhotos(prev => [...prev, ...page.photos]);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);

        setLoading(false);
    }

    return (
        <div className="flex flex-col px-40 py-10 w-full">
            <InfiniteScroll
                dataLength={photos.length}
                next={loadNextPage}
                hasMore={hasMore}
                loader={<LoadingSpinner/>}
                scrollThreshold={0.7}
                style={{ overflow: "visible" }}
            >
                <Masonry columns={3} spacing={2}>
                    {photos.map(photo => (
                        <Image
                            key={photo.id}
                            src={photo.thumbnailUrl}
                            width={photo.thumbWidth}
                            height={photo.thumbHeight}
                            alt=""
                            className="rounded-md cursor-pointer"
                            placeholder={`data:image/svg+xml;base64,${toBase64(
                                shimmer(photo.thumbWidth, photo.thumbHeight)
                            )}`}
                            unoptimized
                            onClick={() =>
                                router.push(`/photos/${photo.id}`, { scroll: false })
                            }
                        />
                    ))}
                </Masonry>
            </InfiniteScroll>
        </div>
    )
}
