// vite.config.ts
import { defineConfig } from "file:///C:/Users/high%20%20end%20pc/Dropbox/git_reps_v2/077-cdb/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/high%20%20end%20pc/Dropbox/git_reps_v2/077-cdb/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/high%20%20end%20pc/Dropbox/git_reps_v2/077-cdb/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\high  end pc\\Dropbox\\git_reps_v2\\077-cdb\\packages\\web";
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    // Allow Replit to access the dev server
    host: "0.0.0.0",
    port: 5174,
    hmr: {
      // Use websocket for HMR in Replit
      port: 5174
    },
    cors: {
      origin: true,
      // Allow all origins in development
      credentials: true
    },
    // Allow all Replit hosts
    allowedHosts: [".replit.dev", ".replit.app", ".repl.co", "localhost"]
  },
  preview: {
    // Production preview server settings for Replit
    host: "0.0.0.0",
    port: 3e3,
    cors: {
      origin: true,
      // Allow all origins for preview
      credentials: true
    },
    // Allow all Replit hosts
    allowedHosts: [".replit.dev", ".replit.app", ".repl.co", "localhost"]
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "SpecifAI",
        short_name: "SpecifAI",
        description: "Voice-to-GitHub-Issue - Autonomously processed",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxoaWdoICBlbmQgcGNcXFxcRHJvcGJveFxcXFxnaXRfcmVwc192MlxcXFwwNzctY2RiXFxcXHBhY2thZ2VzXFxcXHdlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcaGlnaCAgZW5kIHBjXFxcXERyb3Bib3hcXFxcZ2l0X3JlcHNfdjJcXFxcMDc3LWNkYlxcXFxwYWNrYWdlc1xcXFx3ZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2hpZ2glMjAlMjBlbmQlMjBwYy9Ecm9wYm94L2dpdF9yZXBzX3YyLzA3Ny1jZGIvcGFja2FnZXMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICAvLyBBbGxvdyBSZXBsaXQgdG8gYWNjZXNzIHRoZSBkZXYgc2VydmVyXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHBvcnQ6IDUxNzQsXG4gICAgaG1yOiB7XG4gICAgICAvLyBVc2Ugd2Vic29ja2V0IGZvciBITVIgaW4gUmVwbGl0XG4gICAgICBwb3J0OiA1MTc0LFxuICAgIH0sXG4gICAgY29yczoge1xuICAgICAgb3JpZ2luOiB0cnVlLCAvLyBBbGxvdyBhbGwgb3JpZ2lucyBpbiBkZXZlbG9wbWVudFxuICAgICAgY3JlZGVudGlhbHM6IHRydWUsXG4gICAgfSxcbiAgICAvLyBBbGxvdyBhbGwgUmVwbGl0IGhvc3RzXG4gICAgYWxsb3dlZEhvc3RzOiBbJy5yZXBsaXQuZGV2JywgJy5yZXBsaXQuYXBwJywgJy5yZXBsLmNvJywgJ2xvY2FsaG9zdCddLFxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgLy8gUHJvZHVjdGlvbiBwcmV2aWV3IHNlcnZlciBzZXR0aW5ncyBmb3IgUmVwbGl0XG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHBvcnQ6IDMwMDAsXG4gICAgY29yczoge1xuICAgICAgb3JpZ2luOiB0cnVlLCAvLyBBbGxvdyBhbGwgb3JpZ2lucyBmb3IgcHJldmlld1xuICAgICAgY3JlZGVudGlhbHM6IHRydWUsXG4gICAgfSxcbiAgICAvLyBBbGxvdyBhbGwgUmVwbGl0IGhvc3RzXG4gICAgYWxsb3dlZEhvc3RzOiBbJy5yZXBsaXQuZGV2JywgJy5yZXBsaXQuYXBwJywgJy5yZXBsLmNvJywgJ2xvY2FsaG9zdCddLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdtYXNrLWljb24uc3ZnJ10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnU3BlY2lmQUknLFxuICAgICAgICBzaG9ydF9uYW1lOiAnU3BlY2lmQUknLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1ZvaWNlLXRvLUdpdEh1Yi1Jc3N1ZSAtIEF1dG9ub21vdXNseSBwcm9jZXNzZWQnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyMwMDAwMDAnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXG4gICAgICAgIHNjb3BlOiAnLycsXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJ2ljb24tMTkyeDE5Mi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnaWNvbi01MTJ4NTEyLnBuZycsXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICdpY29uLTUxMng1MTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1ksU0FBUyxvQkFBb0I7QUFDL1osT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUN4QixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBO0FBQUEsSUFFTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUE7QUFBQSxNQUVILE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxNQUFNO0FBQUEsTUFDSixRQUFRO0FBQUE7QUFBQSxNQUNSLGFBQWE7QUFBQSxJQUNmO0FBQUE7QUFBQSxJQUVBLGNBQWMsQ0FBQyxlQUFlLGVBQWUsWUFBWSxXQUFXO0FBQUEsRUFDdEU7QUFBQSxFQUNBLFNBQVM7QUFBQTtBQUFBLElBRVAsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLE1BQ0osUUFBUTtBQUFBO0FBQUEsTUFDUixhQUFhO0FBQUEsSUFDZjtBQUFBO0FBQUEsSUFFQSxjQUFjLENBQUMsZUFBZSxlQUFlLFlBQVksV0FBVztBQUFBLEVBQ3RFO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsZUFBZSx3QkFBd0IsZUFBZTtBQUFBLE1BQ3RFLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
