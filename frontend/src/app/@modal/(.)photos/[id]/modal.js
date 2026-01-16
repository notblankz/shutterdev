"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function LightboxModal({children}) {
    const router = useRouter()
    return (
        <Dialog
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
                { children }
            </DialogContent>
        </Dialog>
    )
}
