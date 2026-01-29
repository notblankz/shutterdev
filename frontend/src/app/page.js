// root path
"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Masonry from '@mui/lab/Masonry';
import { useRouter } from "next/navigation";
import InfiniteScroll from "react-infinite-scroll-component";
import { Spinner } from "@/components/ui/spinner";
import { usePhotosStore } from "@/galleryStore";
import { Shimmer, ToBase64 } from "@/components/shimmer";
import { toast } from "sonner";

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center gap-3 mt-8">
            <Spinner className="size-6 mt-1 text-neutral-600" />
            <h1 className="text-2xl text-neutral-600">Loading...</h1>
        </div>
    )
}

export default function TestGalleryPage() {

    const photos = usePhotosStore((state) => state.photos)
    const resetPhotos = usePhotosStore((state) => state.resetPhotos)
    const cursor = usePhotosStore((state) => state.cursor)
    const hasMore = usePhotosStore((state) => state.hasMore)
    const loading = usePhotosStore((state) => state.loading)
    const fetchNextPage = usePhotosStore((state) => state.fetchNextPage)
    const [initialLoading, setInitialLoading] = useState(true)
    const router = useRouter()
    const scrollRef = useRef(null)
    const lastScrollPos = useRef(0)
    const isLoadingMore = useRef(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        let cancelled = false
        async function loadInitialPage() {
            setInitialLoading(true)
            resetPhotos()
            await fetchNextPage(null)
            if (!cancelled) {
                setInitialLoading(false)
            }
        }
        loadInitialPage()

        // cleanup function
        return () => {
            cancelled = true
            if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'auto';
            }
        }
    }, []);

    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        const handleScroll = () => {
            if (!isLoadingMore.current) {
                lastScrollPos.current = scrollElement.scrollTop;
            }
        };

        scrollElement.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollElement.removeEventListener('scroll', handleScroll);
    }, []);

    async function loadNextPage() {
        if (loading || !hasMore || isLoadingMore.current) return;

        isLoadingMore.current = true;
        const scrollElement = scrollRef.current;
        const savedScrollPos = scrollElement?.scrollTop || 0;

        await fetchNextPage();

        // Restore scroll position after images load (claude)
        requestAnimationFrame(() => {
            if (scrollElement && savedScrollPos > 0) {
                scrollElement.scrollTop = savedScrollPos;
            }
            isLoadingMore.current = false;
        });
    }

    function handleRightClick(e) {
        e.preventDefault()
        toast.warning("Nice try :/", { position: "top-right", description: "Downloads are disabled for this gallery" })
    }

    return (
        <div
            ref={scrollRef}
            className="w-full h-dvh overflow-y-auto"
            id="scrollableDiv"
        >
            {initialLoading && (
                <div className="w-full h-dvh flex items-center justify-center gap-2 py-2.5 md:py-5 lg:py-10 xl:py-10">
                    <Spinner className="size-8 text-neutral-700" />
                </div>
            )}
            {!initialLoading && (photos.length > 0) && (
                <div
                    className="flex flex-col px-5 py-2.5 md:px-15 md:py-5 lg:px-20 lg:py-10 xl:px-30 xl:py-10"
                >
                    <InfiniteScroll
                        scrollableTarget="scrollableDiv"
                        dataLength={photos.length}
                        next={loadNextPage}
                        hasMore={hasMore}
                        loader={<LoadingSpinner />}
                        scrollThreshold={0.6}
                        style={{ overflow: "visible", width: "100%" }}
                        className="flex flex-col justify-center items-center"
                    >
                        <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 3 }} spacing={2}>
                            {photos.map(photo => (
                                <Image
                                    key={photo.id}
                                    src={photo.thumbnailUrl}
                                    width={photo.thumbWidth}
                                    height={photo.thumbHeight}
                                    alt=""
                                    className="rounded-md cursor-pointer"
                                    placeholder={`data:image/svg+xml;base64,${ToBase64(
                                        Shimmer(photo.thumbWidth, photo.thumbHeight)
                                    )}`}
                                    unoptimized
                                    onClick={() =>
                                        router.push(`/photos/${photo.id}`, { scroll: false })
                                    }
                                    onContextMenu={handleRightClick}
                                />
                            ))}
                        </Masonry>
                    </InfiniteScroll>
                </div>
            )}
            {!initialLoading && (photos.length === 0) && (
                <h1 className="text-3xl text-center text-neutral-600 mt-10">No Photos to Display</h1>
            )}
        </div>
    )
}
