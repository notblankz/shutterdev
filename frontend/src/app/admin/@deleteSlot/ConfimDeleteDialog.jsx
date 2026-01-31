"use client";

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input";

export default function ConfirmDeleteDialog({
    open,
    onClose,
    count,
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

                <div className="space-y-2">
                    <p className="text-sm text-neutral-300">
                        You are about to permanently delete{" "}
                        <span className="font-semibold text-white">{count}</span> photos.
                    </p>
                    <p className="text-sm text-neutral-500">
                        This action cannot be undone
                    </p>

                    <Input
                        type="password"
                        placeholder="Enter delete pass.."
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                    />
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="secondary" onClick={() => onClose(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => onConfirm(adminPassword)} disabled={deleting || adminPassword.length == 0}>
                        {deleting && <Spinner />}
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
