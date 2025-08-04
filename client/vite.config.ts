import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 8080,
      proxy: {
        "/api": {
          target: "http://server:3003",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      CESIUM_BASE_URL: JSON.stringify(
        isProduction ? "/cesium/" : "/node_modules/cesium/Build/Cesium/"
      ),
      global: "globalThis",
    },
    optimizeDeps: {
      include: [
        "cesium",
        "ol/Map",
        "ol/View",
        "ol/layer/Tile",
        "ol/source/OSM",
      ],
      esbuildOptions: {
        target: "es2020",
      },
    },
    build: {
      minify: isProduction,
      sourcemap: !isProduction,
      target: "es2020",
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Simple chunk splitting for better caching
            if (id.includes("node_modules")) {
              if (id.includes("cesium")) {
                return "vendor-cesium";
              }
              if (id.includes("ol")) {
                return "vendor-ol";
              }
              if (id.includes("react")) {
                return "vendor-react";
              }
              if (id.includes("@mui")) {
                return "vendor-mui";
              }
              return "vendor-other";
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    clearScreen: false,
  };
});
