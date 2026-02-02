// // admin/upload

"use client"

import { useState, useRef } from "react"
import { useAdminStore } from "@/adminStore"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import ExifReader from "exifreader"
import Resizer from "react-image-file-resizer"
import { ChevronDown } from "lucide-react"

export default function AdminUploadSlot() {
    const [isUploading, setIsUploading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [result, setResult] = useState({ message: "", time: "" })
    const [progress, setProgress] = useState(0)
    const [totalImages, setTotalImages] = useState(0)
    const setInvalidateDeleteSlot = useAdminStore((state) => state.setInvalidateDeleteSlot)
    const [failedImages, setFailedImages] = useState([])
    const formRef = useRef(null)

    const CONCURRENCY_LIMIT = 4

    function resetUploadState() {
        setIsUploading(false)
        setProgress(0)
        setTotalImages(0)
        setResult({ success: 0, failed: 0, time: "" })
        setFailedImages([])

        if (formRef.current) {
            formRef.current.reset()
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (isUploading) return

        setIsUploading(true)
        const start = performance.now()

        const { files, tags } = getFormData(e.target)
        if (files.length === 0) {
            setIsUploading(false)
            return
        }

        initializeProgress(files.length)

        let successCount = 0
        let failCount = 0

        await runUploadQueue(files, tags,
            () => setProgress(successCount + failCount),
            () => successCount++,
            () => failCount++
        )

        finishUpload(start, successCount, failCount)
    }

    // <== Helper Functions ==>

    function getFormData(form) {
        const fileInput = form.image
        const tags = form.tags.value
        const files = Array.from(fileInput.files)
        return { files, tags }
    }

    function initializeProgress(total) {
        setTotalImages(total)
        setProgress(0)
        setDialogOpen(true)
        setResult("")
    }

    async function uploadSingleImage(file, tags) {

        // testing
        const buffer = await file.arrayBuffer()
        const tagsExif = ExifReader.load(buffer)

        function processImage(file) {
            return new Promise((resolve, reject) => {
                try {
                    const t0 = performance.now()
                    Resizer.imageFileResizer(
                        file,
                        1440,
                        1440,
                        "WEBP",
                        90,
                        0,
                        (uri) => {
                            resolve(uri)
                        },
                        "blob"
                    )
                } catch (err) {
                    reject(err)
                }
            })
        }

        const fd = new FormData()
        const resizedFile = await processImage(file)
        fd.append("image", resizedFile, file.name)
        fd.append("tags", tags)
        fd.append("exif", JSON.stringify({
            shutterSpeed: tagsExif.ShutterSpeedValue?.description,
            aperture: tagsExif.FNumber?.description,
            iso: tagsExif.ISOSpeedRatings?.description.toString(),
            imageOrientation: tagsExif.Orientation?.value
        }))

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/admin/photos`, {
            method: "POST",
            body: fd,
            credentials: "include",
        }
        )

        if (!res.ok) {
            setFailedImages(prev => [...prev, file.name])
            throw new Error("upload failed")
        }
    }

    function runUploadQueue(files, tags, onProgress, onSuccess, onFail) {
        let active = 0
        let index = 0

        return new Promise((resolve) => {
            function runNext() {
                // only resolve when there are no remaining files and all workers have finished
                if (index >= files.length && active === 0) {
                    resolve()
                    return
                }

                while (active < CONCURRENCY_LIMIT && index < files.length) {
                    const file = files[index]
                    index++
                    active++

                    uploadSingleImage(file, tags)
                        .then(onSuccess)
                        .catch(onFail)
                        // wait till one of the promises resolve or reject and then spawn another one using runNext()
                        // hence making it parallel
                        .finally(() => {
                            active--
                            onProgress()
                            runNext()
                        })
                }
            }

            runNext()
        })
    }

    function finishUpload(start, successCount, failCount) {
        const end = performance.now()

        setResult({
            success: successCount,
            failed: failCount,
            time: `${((end - start) / 1000).toFixed(2)}s`,
        })

        setInvalidateDeleteSlot()
        setIsUploading(false)
    }

    return (
        <div className="max-w-xl mx-auto mt-10 mb-10 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl text-center">
                        Upload Photos
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <form
                        ref={formRef}
                        className="space-y-5"
                        method="POST"
                        onSubmit={handleSubmit}
                    >

                        {/* Image */}
                        <div className="space-y-1">
                            <Label className="pb-2">
                                Image File
                            </Label>
                            <Input
                                type="file"
                                name="image"
                                required
                                multiple
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-1">
                            <Label className="pb-2">
                                Tags (comma separated)
                            </Label>
                            <Input
                                type="text"
                                name="tags"
                                placeholder="e.g. nature, beach, sunset"
                            />
                        </div>

                        {/* Submit */}
                        <Button
                            disabled={isUploading} variant="default" className="w-full"
                        >
                            {isUploading && <Spinner />}
                            {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                    </form>

                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        if (!open) {
                            resetUploadState()
                        }
                        setDialogOpen(open)
                    }}>
                        <DialogContent className="[&>button]:hidden" onInteractOutside={(e) => { e.preventDefault() }}>
                            <DialogHeader>
                                <DialogTitle className="text-2xl">
                                    Upload Status
                                </DialogTitle>
                            </DialogHeader>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="text-sm font-mono">
                                    Uploading {progress} / {totalImages}
                                </div>

                                <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                                    <div
                                        className="bg-green-500 h-3 transition-all"
                                        style={{
                                            width: `${totalImages ? (progress / totalImages) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* vibecoded masterpiece - Failed images summary */}
                            {failedImages.length > 0 && (
                                <details className="group mt-3 rounded border border-red-400 bg-red-950/20 p-3">
                                    <summary className="flex items-center justify-between cursor-pointer text-red-400 font-semibold list-none hover:text-red-300">
                                        <span>Failed Uploads ({failedImages.length})</span>
                                        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                                    </summary>

                                    <ul className="mt-2 max-h-32 overflow-y-auto text-sm text-red-300 list-disc list-inside font-mono">
                                        {failedImages.map((name) => (
                                            <li key={name}>{name}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}

                            {!isUploading && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-0.5 rounded bg-green-900/40 text-green-400 font-semibold">
                                        Complete
                                    </span>
                                    <span className="text-gray-400 font-mono">
                                        {result.success} images in {result.time}
                                    </span>
                                </div>
                            )}


                            <DialogFooter>
                                <Button
                                    onClick={() => {
                                        resetUploadState()
                                        setDialogOpen(false)
                                    }}
                                    disabled={isUploading}
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>

    )
}
