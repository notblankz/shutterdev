"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { ChevronsRight, ChevronsLeft } from "lucide-react";
import { usePhotosStore } from "@/galleryStore";
import { useRef, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

export default function LightboxModal({id, children}) {
    const router = useRouter()

    const photos = usePhotosStore((state) => state.photos)
    const hasMore = usePhotosStore((state) => state.hasMore)
    const loading = usePhotosStore((state) => state.loading)
    const fetchNextPage = usePhotosStore((state) => state.fetchNextPage)
    const getIndexById = usePhotosStore((state) => state.getIndexById)

    const curIdx = getIndexById(id)
    const prev = curIdx > 0 ? photos[curIdx - 1] : null;
    const next = curIdx >= 0 && curIdx < photos.length - 1 ? photos[curIdx + 1] : null;

    const pendingNextRef = useRef(false)

    async function handleNext() {
        if (next) {
            router.replace(`/photos/${next.id}`, { scroll: false });
            return;
        }

        if (!hasMore || loading) return;

        pendingNextRef.current = true;
        fetchNextPage();
    }

    function handlePrev() {
        if (!prev) return;
        router.replace(`/photos/${prev.id}`, { scroll: false });
    }

    useEffect(() => {
        if (!pendingNextRef.current) return;

        const idx = getIndexById(id);
        const newNext = photos[idx + 1];

        if (newNext) {
            pendingNextRef.current = false;
            router.replace(`/photos/${newNext.id}`, { scroll: false });
        }
    }, [photos, id]);


    return (
        <Dialog
            className="relative"
            open
            onOpenChange={(open) => {
                if (!open) {
                    router.back()
                }
            }}>
            <DialogContent
            className="p-0 overflow-hidden flex flex-col
                        w-screen h-dvh max-w-none

                        sm:w-[85vw] sm:h-[95vh]
                        xl:w-[87vw]
                        2xl:w-[89vw]

                        sm:max-w-350
                        xl:max-w-400
                        2xl:max-w-500"
            >
                <DialogHeader className="hidden">
                        <DialogTitle className="text-2xl">
                            Photo Lightbox
                        </DialogTitle>
                </DialogHeader>
                {prev &&
                    <Button variant="outline" onClick={handlePrev} className="absolute left-4 top-[81%] sm:top-[47%] -translate-y-1/2 z-10">
                        <ChevronsLeft/>
                    </Button>}

                { children }

                {(next || hasMore) &&
                    <Button variant="outline" onClick={handleNext} disabled={loading} className="absolute right-4 top-[81%] sm:top-[47%] -translate-y-1/2 z-10">
                        { !loading &&<ChevronsRight/>}
                        { loading && <Spinner/> }
                    </Button>}
            </DialogContent>
        </Dialog>
    )
}
