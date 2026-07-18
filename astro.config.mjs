import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  integrations: [preact()],
  output: 'static',
  // slug-first 名前空間: ツールを runlocally.app/edit-ascii-diagram/ 配下に「物理配置」する
  // （src/pages/edit-ascii-diagram/ + public/edit-ascii-diagram/）。base は使わない（base は URL に
  // prefix を付けるが dist を入れ子化せず、ルート配信の Pages と不整合になるため）。
  // バンドルアセットも /edit-ascii-diagram/_assets/ に隔離し hub/他ツールと無衝突にする。
  build: {
    inlineStylesheets: 'auto',
    assets: 'edit-ascii-diagram/_assets',
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    // D16: no Web Worker — grid parsing/detection/editing is lightweight
    // synchronous work, same call as the other text-oriented tools.
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['preact', 'preact/hooks']
          }
        }
      }
    }
  },
  compressHTML: true,
  scopedStyleStrategy: 'class'
});
