// "/photos/:id - modal view"

import * as React from 'react'
import LightboxModal from './modal';
import PhotoDetail from '@/components/PhotoDetail';

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
    console.log("[SUCCESS] Received Photo with ID: " + photo.id)

    return (
        <LightboxModal>
            <PhotoDetail photo={photo}></PhotoDetail>
        </LightboxModal>
    )
}
