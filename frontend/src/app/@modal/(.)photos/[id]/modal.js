"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { ChevronsRight, ChevronsLeft } from "lucide-react";
import { usePhotosStore } from "@/store";

export default function LightboxModal({id, children}) {
    const router = useRouter()
    const photos = usePhotosStore((state) => state.photos)
    const getPrevNext = usePhotosStore((state) => state.getPrevNext)
    const prevNext = getPrevNext(id)
    const handleClick = (id) => {
        router.replace(`/photos/${id}`, { scroll: false })
    }
    return (
        <Dialog
            className="relative"
            open
            onOpenChange={(open) => {
                if (!open) {
                    router.back()
                }
            }}>
            <DialogContent className="w-[85vw] h-[95vh] max-w-none! p-0 overflow-hidden flex flex-col items-center justify-center gap-0">
                <DialogHeader className="hidden">
                        <DialogTitle className="text-2xl">
                            Lightbox Showing single view of Image
                        </DialogTitle>
                </DialogHeader>
                {prevNext.prev &&
                    <Button variant="ghost" onClick={() => handleClick(prevNext.prev.id)} className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                        <ChevronsLeft/>
                    </Button>}

                { children }

                {prevNext.next &&
                    <Button variant="ghost" onClick={() => handleClick(prevNext.next.id)} className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                        <ChevronsRight/>
                    </Button>}
            </DialogContent>
        </Dialog>
    )
}
