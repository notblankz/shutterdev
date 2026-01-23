// root path

"use client";

import { useEffect } from "react";
import Image from "next/image";
import Masonry from '@mui/lab/Masonry';
import { useRouter } from "next/navigation";
import InfiniteScroll from "react-infinite-scroll-component";
import { Spinner } from "@/components/ui/spinner";
import { usePhotosStore } from "@/galleryStore";
import { Shimmer, ToBase64 } from "@/components/shimmer";

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center gap-3 mt-8">
            <Spinner className="size-6 mt-1 text-neutral-600"/>
            <h1 className="text-2xl text-neutral-600">Loading...</h1>
        </div>
    )
}

export default function TestGalleryPage() {

    const photos = usePhotosStore((state) => state.photos)
    const appendPhotos = usePhotosStore((state) => state.appendPhotos)
    const resetPhotos = usePhotosStore((state) => state.resetPhotos)
    const cursor = usePhotosStore((state) => state.cursor)
    const hasMore = usePhotosStore((state) => state.hasMore)
    const loading = usePhotosStore((state) => state.loading)
    const fetchNextPage = usePhotosStore((state) => state.fetchNextPage)
    const router = useRouter()

    useEffect(() => {
        let cancelled = false
        async function loadInitialPage() {
            resetPhotos()
            const page = await fetchNextPage(null)
            if (cancelled || !page) return
            appendPhotos(page.photos)
        }
        loadInitialPage()

        // cleanup function
        return () => {
            cancelled = true
        }
    }, []);

    async function loadNextPage() {
        if (loading || !hasMore) return;

        const page = await fetchNextPage(cursor);
        if (!page) {
            return;
        }

        appendPhotos(page.photos)

    }

    return (
        <div>
            {(photos.length > 0) &&
                <div className="flex flex-col px-5 py-2.5 md:px-15 md:py-5 lg:px-20 lg:py-10 xl:px-30 xl:py-10 w-full">
                        <InfiniteScroll
                            dataLength={photos.length}
                            next={loadNextPage}
                            hasMore={hasMore}
                            loader={<LoadingSpinner/>}
                            scrollThreshold={0.7}
                            style={{ overflow: "visible" }}
                            className="flex flex-col justify-center items-center"
                        >
                            <Masonry columns={{xs: 1, sm: 2, md:3, lg:3}} spacing={2}>
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
                                    />
                                ))}
                            </Masonry>
                        </InfiniteScroll>
                </div>}
            {(photos.length === 0) && <h1 className="text-3xl text-center text-neutral-600 mt-10">No Photos to Display</h1>}
        </div>
    )
}
