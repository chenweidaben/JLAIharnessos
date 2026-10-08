/**
 * 健澜科技 jlmedaios - PWA Service Worker 注册（M16-A）
 * 浏览器守卫：仅在真实浏览器且支持 service worker 时注册；测试 / SSR / 离线构建下静默跳过，不抛错。
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // 开发模式（非生产构建）不注册，避免缓存干扰热更新。
  if (import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 注册失败不阻断业务；PWA 为增强能力，降级为普通 Web。
    });
  });
}
