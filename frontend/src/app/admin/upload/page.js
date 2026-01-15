// admin/upload

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"


export default function AdminUploadPage() {
    const [isUploading, setIsUploading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [result, setResult] = useState({ message: "", time: "" })

    async function handleSubmit(e) {
        e.preventDefault()

        if (isUploading) return
        setIsUploading(true)

        const start = performance.now()
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
                setResult({message: `Upload Failed due to Error (API): ${err.error}`, time: ""})
                return;
            }

            const end = performance.now()

            const data = await res.json()
            console.log(data)
            setResult({message: `Upload Successfull! Total Images Uploaded: ${data.uploaded}`, time: `${((end - start) / 1000).toFixed(2)}s`})
            setDialogOpen(true)
        } catch (error) {
            setResult({
                message: `Upload failed due to Error: ${error}`,
                time: "",
            })
            setDialogOpen(true)
            console.error(error)
        } finally {
            setIsUploading(false)
        }
    }
    return (
        <div className="max-w-xl mx-auto mt-10 px-4">
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
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-2xl">
                                    Upload Status
                                </DialogTitle>
                            </DialogHeader>

                            {result.message}
                            {result.time && (
                            <div className="text-sm text-gray-500">
                                Time taken: {result.time}
                            </div>
                            )}

                            <DialogFooter>
                                <Button
                                    onClick={() => setDialogOpen(false)}
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
