/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 全局测试 Setup：
 * - jest-dom 匹配器注册
 * - 浏览器 API Mock（localStorage / sessionStorage / matchMedia / IntersectionObserver / ResizeObserver）
 * - Ant Design 全局配置（中文 locale）
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/* ---------------- Ant Design 样式重置：测试中不加载真实 CSS ---------------- */
// AntD v5 基于 CSS-in-JS，jsdom 下无需额外注入样式。
// 以下仅在需要断言 className 时保留。

/* ---------------- 浏览器 API Mock ---------------- */

// localStorage / sessionStorage 在 jsdom 中已可用，这里确保清空
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// matchMedia：jsdom 未实现，AntD 响应式组件依赖
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// IntersectionObserver：虚拟列表 / 懒加载依赖
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!window.IntersectionObserver) {
  // @ts-expect-error 测试环境注入
  window.IntersectionObserver = MockIntersectionObserver;
}

// ResizeObserver：ECharts / 布局组件依赖
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!window.ResizeObserver) {
  window.ResizeObserver = MockResizeObserver;
}

// getComputedStyle：jsdom 已实现，但未实现“带伪元素参数”的调用
// getComputedStyle(elt, '::xxx')；rc-table / rc-dialog 测量滚动条时会以伪元素
// 参数调用，会在布局阶段抛错并中断渲染。统一回退为不带伪元素的计算，
// 滚动条尺寸按 0 处理，足以在 jsdom 中完成布局。
{
  const _origGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = ((elt: Element, pseudo?: string | null) =>
    _origGetComputedStyle(elt, pseudo ? null : pseudo)) as typeof window.getComputedStyle;
}

// scrollTo：jsdom 未实现，消息列表自动滚动依赖
if (!window.scrollTo) {
  window.scrollTo = () => {};
}

// URL.createObjectURL / revokeObjectURL：jsdom 未实现，文件下载工具依赖
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}

// HTMLElement.prototype.scrollTo：同上
if (!HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = () => {};
}

// requestAnimationFrame / cancelAnimationFrame：jsdom 16+ 已实现，此处兜底
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
}
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

/* ---------------- 全局控制台静默（可选：保留 warn/error） ---------------- */
// 测试中若有未处理的 console.error 来自 React 警告，可在此屏蔽特定模式
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  // 屏蔽 React act() 警告（测试中 RTL 已自动包裹 act）
  if (/not wrapped in act/.test(first)) return;
  originalError(...args);
};
