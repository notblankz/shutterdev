import { create } from "zustand";
export const useAdminStore = create((set) => ({
    invalidateDeleteSlot: 0,
    setInvalidateDeleteSlot: () => set((state) => ({ invalidateDeleteSlot: state.invalidateDeleteSlot + 1 })),
}))
