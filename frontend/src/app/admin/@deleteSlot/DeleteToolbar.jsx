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
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
                <p className="text-xl mr-3">Selected: {selectedCount}</p>
                <Button variant="outline" className="mr-3" onClick={onClear}>
                        Clear Selection
                </Button>
            </div>
            <div className="flex items-center">
                <Button
                    variant="destructive"
                    className="mr-3 hover:cursor-pointer hover:bg-red-700!"
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

                <Button
                    variant="destructive"
                    className="mr-3 hover:cursor-pointer hover:bg-red-700!"
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
            </div>
        </div>
    )
}
