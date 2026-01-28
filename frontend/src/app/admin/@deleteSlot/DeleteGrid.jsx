import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Shimmer, ToBase64 } from "@/components/shimmer"

export default function DeleteGrid({
    photos,
    selected,
    toggleSelect,
    hasMore,
    loading,
    fetchNextPage
}) {
    if (photos.length === 0) {
        return <h1 className="text-2xl text-center text-neutral-700">No Photos to Display</h1>
    }

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {photos.map(photo => (
                    <div
                        key={photo.id}
                        onClick={() => toggleSelect(photo.id)}
                        className={`relative aspect-4/3 rounded-lg overflow-hidden cursor-pointer
              ${selected.has(photo.id)
                                ? "ring-2 ring-red-500"
                                : "hover:ring-2 hover:ring-neutral-700"}`}
                    >
                        <Image
                            src={photo.thumbnailUrl}
                            alt=""
                            fill
                            className="object-cover"
                            placeholder={`data:image/svg+xml;base64,${ToBase64(
                                Shimmer(photo.thumbWidth, photo.thumbHeight)
                            )}`}
                            unoptimized
                        />

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
                {hasMore && (
                    <Button className="mt-5" disabled={loading} onClick={fetchNextPage}>
                        {loading && <Spinner />}
                        Load More
                    </Button>
                )}
            </div>
        </div>
    )
}
