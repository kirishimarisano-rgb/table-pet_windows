// Vite 設定：兩個頁面（桌寵主視窗 index.html、設定視窗 settings.html）
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    target: "es2021",
    rollupOptions: {
      input: {
        main: "index.html",
        settings: "settings.html",
      },
    },
  },
});
