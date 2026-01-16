// "/photos/:id - modal view"

import * as React from 'react'
import LightboxModal from './modal';
import { Button } from '@/components/ui/button';

export default async function PhotoLightboxPage({ params }) {
    const { id } = await params

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/photos/${id}`,
        { cache: "no-store" }
    )

    if (!res.ok) {
        throw new Error("Failed to fetch photo")
    }

    const photo = await res.json()
    console.log(photo)

    return (
        <LightboxModal>
            <div className="flex-1 flex items-center justify-center overflow-hidden m-6">
                <img src={photo.imageUrl} className="max-w-full max-h-full object-contain select-none"/>
            </div>
            <div className="shrink-0 w-full p-4 border-t bg-background flex justify-between items-center">
                <div className="text-[#b3b3b3] text-m tracking-wide">
                    {photo.exif.shutterSpeed} &nbsp; {photo.exif.aperture} &nbsp; ISO{photo.exif.iso}
                </div>
                <div className='w-1/2 text-right flex justify-end gap-2'>
                    {/* tags is an array of objects */}
                    {(photo.tags)?.map((tag) => (
                        <Button key={tag.id} disabled className="bg-[#1a1a1a] text-[#e5e5e5] border border-white/10" >{tag.tagName}</Button>
                    ))}
                </div>
            </div>
        </LightboxModal>
    )
}
