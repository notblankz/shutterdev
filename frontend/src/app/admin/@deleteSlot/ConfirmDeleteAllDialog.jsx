"use client";

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

export default function ConfirmDeleteAllDialog({
    open,
    onClose,
    confirmText,
    setConfirmText,
    deleting,
    onConfirm
}) {

    const [adminPassword, setAdminPassword] = useState("")

    useEffect(() => {
        if (open) {
            setAdminPassword("")
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5" />
                        Confirm Deletion
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <p className="text-sm text-neutral-300">
                        This will permanently delete <b>ALL photos</b>.
                    </p>

                    <p className="text-sm text-neutral-500">
                        Type <span className="font-mono text-red-400">delete all photos</span> to confirm.
                    </p>

                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="delete all photos"
                        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    />

                    <Input
                        type="password"
                        placeholder="Enter delete pass.."
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        disabled={confirmText !== "delete all photos"}
                    />
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        variant="destructive"
                        onClick={() => onConfirm(adminPassword)}
                        disabled={confirmText !== "delete all photos" || deleting || adminPassword.length == 0}
                    >
                        {deleting && <Spinner />}
                        Delete EVERYTHING
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
