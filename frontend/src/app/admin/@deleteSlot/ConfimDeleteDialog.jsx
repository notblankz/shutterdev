import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

export default function ConfirmDeleteDialog({
    open,
    onClose,
    count,
    deleting,
    onConfirm
}) {
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
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="secondary" onClick={() => onClose(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
                        {deleting && <Spinner />}
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
