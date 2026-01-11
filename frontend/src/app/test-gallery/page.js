//"/test-gallery"

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
        // TOOD: implement pagination
        <div className="flex justify-center items-center px-40 py-10">
            <div className="columns-2 md:columns-3 gap-4">
            {photos.map((photo, index) => (
                <div key={photo.id} className="mb-4 break-inside-avoid">
                    {}
                    <Image
                        src={photo.thumbnailUrl}
                        width={photo.thumbWidth}
                        height={photo.thumbHeight}
                        alt="photo by photographer" // TODO: add description as alt text
                        className="rounded-md"
                        priority={index < 6}
                        unoptimized // TODO: check perf diff between unoptimised and optimised
                    />
                </div>
            ))}
            </div>
        </div>

    )
}
