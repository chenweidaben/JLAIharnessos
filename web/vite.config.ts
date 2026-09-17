/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Vite 构建配置：路径别名 / 开发代理 / 构建分包优化
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 构建体积分析报告（`--mode analyze` 时启用，输出 dist/stats.html）
    process.env.ANALYZE === 'true' &&
      visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true, brotliSize: true }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    proxy: {
      // 后端 BFF 统一前缀 /api/v1，保持路径透传（不 rewrite），
      // 使 /api/v1/** 直连 Bun 服务 8080 端口的同名路由。
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_WS_PROXY_TARGET || 'ws://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    // 生产环境使用 hidden-sourcemap：不上传到 CDN，仅用于错误监控堆栈还原
    sourcemap: process.env.GENERATE_SOURCEMAP === 'true' ? 'hidden' : false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'echarts-vendor': ['echarts', 'echarts-for-react'],
          utils: ['axios', 'dayjs', 'lodash-es', 'clsx', 'zustand'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'antd', 'zustand', 'axios', 'dayjs', 'lodash-es'],
  },
});
