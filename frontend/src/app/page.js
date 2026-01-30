// root path
"use client";

import { useEffect, useState } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import Image from 'next/image';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { usePhotosStore } from '@/galleryStore.js';
import { Shimmer, ToBase64 } from '@/components/shimmer';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { getNormalizedDimensions } from '@/lib/imageUtils';

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center text-neutral-700 py-4">
            <Spinner className="size-5 lg:size-7" />
        </div>
    )
}

export default function Home() {
    const { photos, loading, hasMore, resetPhotos, fetchNextPage } = usePhotosStore();
    const router = useRouter()
    const [initialLoading, setInitialLoading] = useState(true)

    useEffect(() => {
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
        }
    }, []);

    const [sentinelRef] = useInfiniteScroll({
        loading,
        hasNextPage: hasMore,
        onLoadMore: fetchNextPage,
        rootMargin: '0px 0px 800px 0px',
    });

    function handleRightClick(e) {
        e.preventDefault()
        toast.warning("Nice try :/", { position: "top-right", description: "Downloads are disabled for this gallery" })
    }

    return (
        <div>
            {initialLoading && (
                <div className="w-full h-dvh flex items-center justify-center">
                    <Spinner className="size-8 text-neutral-700" />
                </div>
            )}
            {!initialLoading && (
                <div className="container mx-auto px-4 pt-8">
                    {photos.length === 0 && !loading ? (
                        <div className="text-center text-neutral-700">
                            <p>No photos found</p>
                        </div>
                    ) : (
                        <div>
                            <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 600: 2, 900: 3, 1200: 3 }}>
                                <Masonry gutter="1rem">
                                    {photos.map((photo) => {
                                        const { width, height } = getNormalizedDimensions(
                                            photo.thumbWidth,
                                            photo.thumbHeight
                                        );

                                        return (
                                            <div
                                                key={photo.id}
                                                className="relative w-full overflow-hidden rounded-md cursor-pointer group"
                                                style={{
                                                    aspectRatio: `${width} / ${height}`,
                                                    maxHeight: 'min(700px, 80vh)'
                                                }}
                                            >
                                                <Image
                                                    src={photo.thumbnailUrl}
                                                    fill
                                                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                                                    alt=""
                                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                                    placeholder="blur"
                                                    blurDataURL={`data:image/svg+xml;base64,${ToBase64(
                                                        Shimmer(width, height)
                                                    )}`}
                                                    unoptimized
                                                    onClick={() =>
                                                        router.push(`/photos/${photo.id}`, { scroll: false })
                                                    }
                                                    onContextMenu={handleRightClick}
                                                />
                                            </div>
                                        );
                                    })}
                                </Masonry>
                            </ResponsiveMasonry>
                            <div ref={sentinelRef} className="w-full">
                                {loading && (<LoadingSpinner/>)}
                            </div>
                            {!hasMore && photos.length > 0 && (
                                <div className="text-center text-neutral-700 md:text-lg pb-4">
                                    <p>[That's all I've got to show]</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
