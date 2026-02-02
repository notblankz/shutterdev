// // admin/upload

"use client"

import { useState } from "react"
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

export default function AdminUploadSlot() {
    const [isUploading, setIsUploading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [result, setResult] = useState({ message: "", time: "" })
    const [progress, setProgress] = useState(0)
    const [totalImages, setTotalImages] = useState(0)
    const setInvalidateDeleteSlot = useAdminStore((state) => state.setInvalidateDeleteSlot)
    const [failedImages, setFailedImages] = useState([])

    const CONCURRENCY_LIMIT = 4

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
        console.log(`Finished Extracting EXIF For: ${file.name}`)
        console.log(JSON.stringify({
            shutterSpeed: tagsExif.ShutterSpeedValue?.description,
            aperture: tagsExif.FNumber?.description,
            iso: tagsExif.ISOSpeedRatings?.description.toString(),
            imageOrientation: tagsExif.Orientation?.value
        }))

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
                            console.log(`Finished Resizing the image: ${file.name} took ${((performance.now() - t0)/1000).toFixed(2)}s`)
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
            message: `Upload finished. Success: ${successCount}, Failed: ${(failCount == 0) ? "0" : failedImages}`,
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

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogContent className="[&>button]:hidden" onInteractOutside={(e) => { e.preventDefault() }}>
                            <DialogHeader>
                                <DialogTitle className="text-2xl">
                                    Upload Status
                                </DialogTitle>
                            </DialogHeader>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="text-sm">
                                    Uploaded {progress} / {totalImages}
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

                            {!isUploading && result.message}
                            {result.time && (
                                <div className="text-sm text-gray-500">
                                    Time taken: {result.time}
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    onClick={() => {
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
