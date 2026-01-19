import { create } from "zustand";

export const usePhotosStore = create((set, get) => ({
    photos: [],

    appendPhotos: (photos) => {
        set((state) => ({
            photos: [...state.photos, ...photos]
        }))
    },

    resetPhotos: () => set({photos: []}),

    getIndexById: (id) => {
        return get().photos.findIndex((p) => p.id === id)
    },

    getPrevNext: (id) => {
        const photos = get().photos
        const index = photos.findIndex((p) => p.id === id)

        return {
            prev: index > 0 ? photos[index - 1] : null,
            next: index >= 0 && index < photos.length - 1 ? photos[index + 1] : null,
        }
    }
}))
