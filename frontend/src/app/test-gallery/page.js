//"/test-gallery"

"use client";

import { useEffect, useState } from "react";

export default function TestGalleryPage() {

    // limit and offset variables
    const limit = 20;
    const [offset, setOffset] = useState(0);
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        async function fetchData() {
            const t0 = performance.now()
            console.log("Page mounted at:", (t0 / 1000).toFixed(3), "s");

            try {
                console.log("We will call the API here")
                const limit = 20
                var offset = 0
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos?limit=${limit}&offset=${offset}`, {
                    method: "GET",
                })
                if (!res.ok) {
                    const err = await res.json()
                    console.log(err)
                }
                const photos = await res.json()
                setPhotos(photos)
                const t1 = performance.now()
                console.log(photos)
                console.log("Time taken to fetch from API: ", ((t1-t0)/100).toFixed(2), "s")
                return photos
            } catch(e) {
                console.log(e)
            }
        }
        fetchData()
    }, []);


    return (
        // map a button to use setOffset to load the next page of photos
        <div className="flex justify-center items-center px-40 py-10">
            <div className="columns-2 md:columns-3 gap-4">
            {photos.map(photo => (
                <div key={photo.id} className="mb-4 break-inside-avoid">
                <img
                    src={photo.thumbnailUrl}
                    className="w-full rounded-md"
                    style={{
                    aspectRatio: `${photo.thumbWidth} / ${photo.thumbHeight}`,
                    }}
                />
                </div>
            ))}
            </div>
        </div>

    )
}
