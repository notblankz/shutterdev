// admin/upload

"use client";

import { useState } from "react";

export default function AdminUploadPage() {
    const [message, setMessage] = useState("")
    const [time, setTime] = useState("")

    async function handleSubmit(e) {
        e.preventDefault()
        const t0 = performance.now()
        const formData = new FormData(e.target);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/photos`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY}`
                },
                body: formData
            })

            if (!res.ok) {
                const err = await res.json()
                setMessage("Error: " + err.error)
                return;
            }

            const t1 = performance.now()

            const data = await res.json()
            console.log(data)
            setMessage("YAY! Total Photos Uploaded Sucessfully: " + data)
            setTime("Total Time Taken: " + (t1 - t0) / 1000)

        } catch (error) {
            setMessage("Oops! something went wrong while uploading the image")
            console.log(error)
        }
    }
    return (
        <div className="max-w-xl mx-auto mt-10 px-4">
            <h1 className="text-2xl font-semibold mb-6">
                Upload a Photo
            </h1>

            <form className="space-y-5" method="POST" onSubmit={handleSubmit}>
                {/* Image */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Image File
                    </label>
                    <input
                        type="file"
                        name="image"
                        required
                        className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700
                        hover:file:bg-gray-200"
                        multiple
                    />
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        name="title"
                        required
                        className="w-full rounded-md border border-gray-300
                       px-3 py-2 text-sm
                       focus:outline-none focus:ring-2
                       focus:ring-black"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        rows="3"
                        className="w-full rounded-md border border-gray-300
                       px-3 py-2 text-sm
                       focus:outline-none focus:ring-2
                       focus:ring-black"
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Tags (comma separated)
                    </label>
                    <input
                        type="text"
                        name="tags"
                        placeholder="e.g. nature, beach, sunset"
                        className="w-full rounded-md border border-gray-300
                       px-3 py-2 text-sm
                       placeholder-gray-400
                       focus:outline-none focus:ring-2
                       focus:ring-black"
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="inline-flex items-center
                     rounded-md bg-black px-5 py-2
                     text-sm font-medium text-white
                     hover:bg-gray-800
                     focus:outline-none focus:ring-2
                     focus:ring-black"
                >
                    Upload
                </button>
            </form>
            {message && (
                <p style={{ marginTop: 20 }}>
                    {message}
                </p>
            )}
            {time && (
                <p style={{ marginTop: 10 }}>
                    {time}
                </p>
            )}
        </div>
    )
}
