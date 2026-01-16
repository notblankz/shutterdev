// "/photos/:id - full view"

import PhotoDetail from '@/components/PhotoDetail'
import * as React from 'react'

export default async function PhotoLightboxPage({ params }) {
    const { id } = await params
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/photos/${id}`,
        { cache: "no-store" }
    )

    const photo = await res.json()

    return (
        <main className="h-screen overflow-hidden min-h-screen flex flex-col items-center justify-center">
            <PhotoDetail photo={photo} />
        </main>
    )
}
