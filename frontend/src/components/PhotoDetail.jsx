"use client";

import { Button } from "./ui/button"
import { toast } from "sonner";

export default function PhotoDetail({ photo }) {

    function handleRightClick(e) {
        e.preventDefault()
        toast.warning("Nice try :/", { position: "top-right" , description: "Downloads are disabled for this gallery"})
    }

    return (
        <div className="flex flex-col h-full w-full">
        {/* Image area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
            <img
            src={photo.imageUrl}
            alt=""
            className="max-w-full max-h-full object-contain select-none"
            onContextMenu={handleRightClick}
            />
        </div>

        {/* Metadata bar */}
        <div className="shrink-0 w-full p-4 border-t bg-background flex flex-col sm:flex-row justify-between items-center">
            <div className="text-[#b3b3b3] text-sm tracking-wide pb-5 sm:pb-0">
            {photo.exif.shutterSpeed} &middot; {photo.exif.aperture} &middot; ISO{photo.exif.iso}
            </div>

            <div className="flex gap-2 w-full items-center justify-center sm:w-auto sm:justify-start">
            {(photo.tags ?? []).map(tag => (
                <Button
                key={tag.id}
                className="bg-[#1a1a1a] text-[#e5e5e5] border border-white/10"
                disabled
                >
                {tag.tagName}
                </Button>
            ))}
            </div>
        </div>
        </div>
  )
}
