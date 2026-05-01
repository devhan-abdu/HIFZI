import { create } from "zustand";

interface CelebrationStore {
  isVisible: boolean;
  type: "success" | "badge" | "xp";
  message: string;
  trigger: (message?: string, type?: "success" | "badge" | "xp") => void;
  hide: () => void;
}

export const useCelebrationStore = create<CelebrationStore>((set) => ({
  isVisible: false,
  type: "success",
  message: "MashAllah!",
  trigger: (message = "MashAllah!", type = "success") => {
    set({ isVisible: true, message, type });
  },
  hide: () => set({ isVisible: false }),
}));
