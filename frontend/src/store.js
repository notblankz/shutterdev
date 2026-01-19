import { create } from "zustand";

export const usePhotosStore = create((set, get) => ({
    photos: [],
    cursor: null,
    hasMore: true,
    loading: false,

    appendPhotos: (photos) => {
        set((state) => ({
            photos: [...state.photos, ...photos]
        }))
    },

    resetPhotos: () => set({photos: [], cursor: null, hasMore: true, loading: false}),

    getIndexById: (id) => {
        return get().photos.findIndex((p) => p.id === id)
    },

    fetchNextPage: async () => {

        const {cursor, hasMore, loading} = get()
        if (!hasMore || loading) return

        set({loading: true})

        try {
            const requestLink =
                process.env.NEXT_PUBLIC_API_URL + (cursor ? `/api/photos?cursor=${btoa(JSON.stringify(cursor))}` : "/api/photos")

            const res = await fetch(requestLink, {method: "GET"})
            if (!res.ok) {
                const err = await res.json()
                console.log(err)
                throw new Error("Failed to fetch photos");
            }
            const page = await res.json()
            set((state) => ({
                photos: [...state.photos, ...page.photos],
                cursor: page.nextCursor,
                hasMore: page.hasMore,
                loading: false
            }))
        } catch (e) {
            console.error(e)
            set({loading: false})
        }
    }
}))
