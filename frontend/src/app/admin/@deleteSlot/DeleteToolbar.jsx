import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Skull } from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function DeleteToolbar({
    selectedCount,
    hasPhotos,
    onClear,
    onNukeOrphans,
    onDeleteSelected,
    onDeleteAll
}) {
    return (
        <div className="flex items-end justify-between mb-3 lg:items-center">
            <div className="flex flex-col items-start justify-center gap-1.5 lg:gap-3 lg:flex-row lg:items-center">
                <p className="text-xl">Selected: {selectedCount}</p>
                <Button variant="outline" onClick={onClear}>
                        Clear Selection
                </Button>
            </div>
            <div className="flex flex-col items-end gap-1.5 lg:flex-row lg:items-center lg:gap-3">
                <Button
                    variant="destructive"
                    className="hover:cursor-pointer hover:bg-red-700!"
                    onClick={onDeleteSelected}
                    disabled={selectedCount === 0}
                >
                    <Trash2/>
                    Delete Selected
                </Button>
                <Button
                    variant="destructive"
                    className="hover:cursor-pointer hover:bg-red-700!"
                    onClick={onDeleteAll}
                    disabled={!hasPhotos}
                >
                    <Skull/>
                    Delete EVERYTHING
                </Button>
                <Button
                    variant="destructive"
                    className="hover:cursor-pointer hover:bg-red-700!"
                    onClick={() => {
                        toast.promise(onNukeOrphans(), {
                            loading: "Nuking orphan R2 blobs...",
                            success: (data) => `Deleted ${data.success} blobs, ${data.failed} failed`,
                            error: (err) => err.message,
                            position: "top-right"
                        })
                    }}
                >
                    <AlertTriangle />
                    Nuke Orphan R2 Blobs
                </Button>
            </div>
        </div>
    )
}
