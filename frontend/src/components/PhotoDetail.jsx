"use client";

import { Button } from "./ui/button"
import { toast } from "sonner";
import Image from "next/image";

export default function PhotoDetail({ photo }) {

    function handleRightClick(e) {
        e.preventDefault()
        toast.warning("Nice try :/", { position: "top-right", description: "Downloads are disabled for this gallery" })
    }

    const exifParts = [
        photo.exif.shutterSpeed,
        photo.exif.aperture,
        photo.exif.iso && `ISO${photo.exif.iso}`,
    ].filter((value) => Boolean(value));

    return (
        <div className="flex flex-col h-full w-full">
            {/* Image area */}
            <div className="relative flex-1 overflow-hidden p-6">
                <Image
                    src={photo.imageUrl}
                    alt="Photo by photographer"
                    fill
                    className="object-contain select-none p-6"
                    onContextMenu={handleRightClick}
                    unoptimized
                />
            </div>

            {/* Metadata bar */}
            <div className="shrink-0 w-full p-4 border-t bg-background flex flex-col sm:flex-row justify-between items-center">
                <div className="text-[#b3b3b3] text-sm tracking-wide pb-5 sm:pb-0">
                    {exifParts.length === 0 ? (
                        "No Exif Data"
                    ) : (
                        exifParts.map((part, i) => (
                            <span key={i}>
                                {part}
                                {i < exifParts.length - 1 && <span className="mx-1">&middot;</span>}
                            </span>
                        ))
                    )}
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
