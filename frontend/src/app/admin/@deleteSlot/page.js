"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react"
import { Shimmer, ToBase64 } from "@/components/shimmer";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DeleteSlot() {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [cursor, setCursor] = useState("")
    const [selected, setSelected] = useState(() => new Set());
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    function toggleSelect(id) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    async function handleConfirmDelete() {
        setDeleting(true)
        const toDeleteJSON = {"DeleteIDs": Array.from(selected)}
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/photos`, {
            method: "DELETE",
            headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY}`,
                    "Content-Type": "application/json"
            },
            body: JSON.stringify(toDeleteJSON)
        })

        if (!res.ok) {
            const err = await res.json()
            console.log(err)
            setDeleting(false)
            throw new Error("Could not delete photos");
        }

        const data = await res.json()
        toast.success("Successfully deleted selected photos", { position: "top-right", description: `Total Photos Deleted: ${selected.size}` })
        setDeleting(false)
        setDialogOpen(false)
        resetAndFetch()
    }

    async function fetchFirstPage() {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos`)
            if (!res.ok) throw new Error("Failed to fetch photos")

            const data = await res.json()
            console.log(data)

            setPhotos(data.photos)
            setCursor(data.nextCursor)
            setHasMore(data.hasMore)
        } finally {
            setLoading(false)
        }
    }


    async function fetchNextPage() {

        if (!cursor) return

        setLoading(true)
        try {
            const requestLink = process.env.NEXT_PUBLIC_API_URL + (`/api/photos?cursor=${btoa(JSON.stringify(cursor))}`)

            const res = await fetch(requestLink, {method: "GET"})
            if (!res.ok) {
                const err = await res.json()
                console.log(err)
                throw new Error("Failed to fetch photos");
            }
            const data = await res.json()
            console.log(data)

            setPhotos((prev) => ([...prev, ...data.photos]))
            setHasMore(data.hasMore)
            setCursor(data.nextCursor)
        } catch (e) {
            console.log(e)
        } finally {
            setLoading(false)
        }
    }

    function resetAndFetch() {
        setSelected(new Set())
        fetchFirstPage()
    }

    useEffect(() => {
        console.log(hasMore)
        fetchFirstPage()
    }, [])

    return (
        // Vibe Coded Masterpiece of an UI
        <div className="mx-5" >
            <h1 className="text-3xl text-center mb-8">Delete Photos</h1>

            {/* Selection Information and Delete Button*/}
            <div className="flex items-center justify-between mb-3">
                <p className="text-xl">Selected: {selected.size}</p>
                <div className="flex items-center">
                    <Button variant="outline" className="mr-3" onClick={() => {setSelected(() => (new Set()))}} >Clear Selection</Button>
                    <Button
                        variant="destructive"
                        className="hover:cursor-pointer"
                        onClick={() => setDialogOpen(true)}
                        disabled={(selected.size > 0) ? false : true}
                    >
                        <Trash2/>
                        Delete
                    </Button>
                </div>
            </div>

            {(photos.length === 0) && <h1 className="text-2xl text-center text-neutral-700" >No Photos to Display</h1>}

            {(photos.length > 0) &&
                <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {photos.map((photo) => (
                            <div
                                key={photo.id}
                                onClick={() => toggleSelect(photo.id)}
                                className={`relative aspect-4/3 rounded-lg overflow-hidden cursor-pointer
                                ${selected.has(photo.id)
                                        ? "ring-2 ring-red-500"
                                        : "hover:ring-2 hover:ring-neutral-700"}
                            `}
                            >
                                <Image
                                    src={photo.thumbnailUrl}
                                    alt=""
                                    fill
                                    sizes="
                                        (min-width: 1280px) 20vw,
                                        (min-width: 768px) 25vw,
                                        (min-width: 640px) 33vw,
                                        50vw
                                    "
                                    className="object-cover"
                                    placeholder={`data:image/svg+xml;base64,${ToBase64(
                                        Shimmer(photo.thumbWidth, photo.thumbHeight)
                                    )}`}
                                />
                                {/* Dark overlay when selected */}
                                {selected.has(photo.id) && (
                                    <div className="absolute inset-0 bg-black/30" />
                                )}
                                <input
                                    type="checkbox"
                                    checked={selected.has(photo.id)}
                                    onChange={() => toggleSelect(photo.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-2 left-2 h-4 w-4 accent-red-500"
                                />
                                <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded">
                                    {new Date(photo.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="w-full flex items-center justify-center mb-10">
                        {hasMore &&
                            (<Button className="mt-5 hover:cursor-pointer" disabled={loading} onClick={fetchNextPage}>
                                    {loading && <Spinner/>}
                                    Load More
                            </Button>)}
                    </div>
                </div>
            }

            {/* Dialog Box ( Non Vibe-coded :0 ) */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5" />
                        Confirm Deletion
                    </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2">
                    <p className="text-sm text-neutral-300">
                        You are about to permanently delete{" "}
                        <span className="font-semibold text-white">
                        {selected.size}
                        </span>{" "}
                        photos.
                    </p>

                    <p className="text-sm text-neutral-500">
                        This action cannot be undone
                    </p>
                    </div>

                    <DialogFooter className="mt-4">
                    <Button
                        variant="secondary"
                        onClick={() => setDialogOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        className="flex items-center gap-2"
                        onClick={handleConfirmDelete}
                        disabled={deleting}
                    >
                        {deleting && <Spinner/>}
                        Delete
                    </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
        </div>
    )
}
