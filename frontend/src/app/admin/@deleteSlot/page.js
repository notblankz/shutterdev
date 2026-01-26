"use client";

import { useEffect, useState } from "react"
import { toast } from "sonner";
import { useAdminStore } from "@/adminStore";

import DeleteToolbar from "./DeleteToolbar.jsx";
import DeleteGrid from "./DeleteGrid.jsx";
import ConfirmDeleteDialog from "./ConfimDeleteDialog.jsx";
import ConfirmDeleteAllDialog from "./ConfirmDeleteAllDialog.jsx";

export default function DeleteSlotPage() {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [cursor, setCursor] = useState("")
    const [selected, setSelected] = useState(() => new Set())
    const [dialogOpen, setDialogOpen] = useState(false)
    const [inputDialogOpen, setInputDialogOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [deleting, setDeleting] = useState(false)

    const invalidateDeleteSlot = useAdminStore((state) => state.invalidateDeleteSlot)
    const setInvalidateDeleteSlot = useAdminStore((state) => state.setInvalidateDeleteSlot)

    function toggleSelect(id) {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    async function handleNukeOrphans() {
        return fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/photos/failed`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY}`,
            },
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to nuke orphan blobs");
            }
            return res.json();
        });
    }


    async function handleConfirmDelete() {
        setDeleting(true)
        const toDeleteJSON = { DeleteIDs: Array.from(selected) }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/photos`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(toDeleteJSON)
        })

        if (!res.ok) {
            setDeleting(false)
            throw new Error("Could not delete photos")
        }

        const data = await res.json()
        toast.success("Successfully deleted selected photos", {
            position: "top-right",
            description: `Total Photos Deleted: ${data.db_deleted}`
        })

        setDeleting(false)
        setDialogOpen(false)
        setInvalidateDeleteSlot()
    }

    async function handleConfirmDeleteAll() {
        setDeleting(true)

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/photos/all`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY}`,
                "Content-Type": "application/json"
            }
        })

        if (!res.ok) {
            setDeleting(false)
            throw new Error("Could not delete photos")
        }

        const data = await res.json()
        toast.success("Successfully deleted ALL photos", {
            position: "top-right",
            description: `Total Photos Deleted: ${data.db_deleted}`
        })

        setDeleting(false)
        setInputDialogOpen(false)
        setInvalidateDeleteSlot()
    }

    async function fetchFirstPage() {
        setLoading(true)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos`)
        const data = await res.json()
        setPhotos(data.photos)
        setCursor(data.nextCursor)
        setHasMore(data.hasMore)
        setLoading(false)
    }

    async function fetchNextPage() {
        if (!cursor) return
        setLoading(true)

        const requestLink = `${process.env.NEXT_PUBLIC_API_URL}/api/photos?cursor=${btoa(JSON.stringify(cursor))}`
        const res = await fetch(requestLink)
        const data = await res.json()

        setPhotos(prev => [...prev, ...data.photos])
        setHasMore(data.hasMore)
        setCursor(data.nextCursor)
        setLoading(false)
    }

    useEffect(() => { fetchFirstPage() }, [])
    useEffect(() => { fetchFirstPage() }, [invalidateDeleteSlot])
    useEffect(() => { if (!inputDialogOpen) setConfirmText("") }, [inputDialogOpen])

    return (
        <div className="mx-5">
            <h1 className="text-3xl text-center mb-8">Delete Photos</h1>

            <DeleteToolbar
                selectedCount={selected.size}
                hasPhotos={photos.length > 0}
                onClear={() => setSelected(new Set())}
                onNukeOrphans={handleNukeOrphans}
                onDeleteSelected={() => setDialogOpen(true)}
                onDeleteAll={() => setInputDialogOpen(true)}
            />

            <DeleteGrid
                photos={photos}
                selected={selected}
                toggleSelect={toggleSelect}
                hasMore={hasMore}
                loading={loading}
                fetchNextPage={fetchNextPage}
            />

            <ConfirmDeleteDialog
                open={dialogOpen}
                onClose={setDialogOpen}
                count={selected.size}
                deleting={deleting}
                onConfirm={handleConfirmDelete}
            />

            <ConfirmDeleteAllDialog
                open={inputDialogOpen}
                onClose={setInputDialogOpen}
                confirmText={confirmText}
                setConfirmText={setConfirmText}
                deleting={deleting}
                onConfirm={handleConfirmDeleteAll}
            />
        </div>
    )
}
