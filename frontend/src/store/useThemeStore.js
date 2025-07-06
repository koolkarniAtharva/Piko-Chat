import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("piko-chat-theme") || "coffee",
  setTheme: (theme) => {
          localStorage.setItem("piko-chat-theme", theme);
    set({ theme });
  },
}));
