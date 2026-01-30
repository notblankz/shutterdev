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
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { VT323 } from "next/font/google";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
});

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
    const commitShort = process.env.NEXT_PUBLIC_GIT_COMMIT_SHORT || 'unknown';
    const commitFull = process.env.NEXT_PUBLIC_GIT_COMMIT_FULL;
    const commitUrl = commitFull ? `https://github.com/notblankz/shutterdev/commit/${commitFull}` : null;

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
                <div>
                    <div id="top-bar" className='sticky top-0 z-50 outline-1 bg-white dark:bg-[#0a0a0a]'>
                        <div className='w-full mx-auto px-5 py-2.5 flex justify-between items-center'>
                            <div id='left-text' className={vt323.className}>
                                <h1 className='text-2xl md:text-3xl font-bold pb-1 tracking-widest'>
                                    <div className='flex items-center gap-1 hover:underline'>
                                        <Link href='https://github.com/notblankz/shutterdev/' target="_blank" rel="noopener noreferrer" >shutterdev</Link>
                                        <ExternalLink className='size-3.5 mt-1' />
                                    </div>
                                </h1>
                            </div>
                            <div className='flex gap-1 flex-col items-end md:flex-row md:gap-5'>
                                <Button variant='link' className="p-0 flex gap-1" size='xs'>
                                    <Link href='https://github.com/notblankz/' target="_blank" rel="noopener noreferrer" >github</Link>
                                    <ExternalLink className='size-3.5 mt-0.5' />
                                </Button>
                                <Button variant='link' className="p-0 flex gap-1" size='xs'>
                                    <Link href='https://www.instagram.com/aahanclicks/' target="_blank" rel="noopener noreferrer" >instagram</Link>
                                    <ExternalLink className="size-3.5 mt-0.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-335 mx-auto pt-4">
                        {photos.length === 0 && !loading ? (
                            <div className="text-center text-neutral-700">
                                <p>No photos found</p>
                            </div>
                        ) : (
                            <div className='mx-4'>
                                <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 767: 2, 990: 3 }}>
                                    <Masonry>
                                        {photos.map((photo) => {
                                            const { width, height } = getNormalizedDimensions(
                                                photo.thumbWidth,
                                                photo.thumbHeight
                                            )

                                            return (
                                                <div
                                                    key={photo.id}
                                                    className="relative w-full overflow-hidden cursor-pointer group md:m-1.5"
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
                                    {loading && (<LoadingSpinner />)}
                                </div>
                            </div>
                        )}
                    </div>
                    {!hasMore && photos.length > 0 && (
                        <div className="w-full py-4 mt-4 border-t border-border">
                            <div className="grid grid-cols-3 items-center text-sm text-muted-foreground">

                                <div>

                                </div>

                                <div className="text-center">
                                    <p className="text-2xl md:text-4xl tracking-widest font-serif text-foreground opacity-80">
                                        THE END
                                    </p>
                                </div>

                                <div className="text-right pr-4 text-xs opacity-70">
                                    <p>Built from source</p>
                                    {commitUrl ? (
                                        <a
                                            href={commitUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono hover:underline"
                                        >
                                            commit <span className='underline'>{commitShort}</span>
                                        </a>
                                    ) : (
                                        <p className="font-mono">commit <span className='underline'>{commitShort}</span></p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
