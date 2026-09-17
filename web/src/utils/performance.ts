/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 性能优化工具：虚拟列表 / 防抖节流 / 图片懒加载
 */
import { useEffect, useRef, useState, useCallback } from 'react';

/** 防抖 Hook */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** 节流 Hook（立即执行 + 尾调用） */
export function useThrottle<T extends (...args: never[]) => void>(fn: T, delay = 300): T {
  const lastRun = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (...args: never[]) => {
      const now = Date.now();
      const remaining = delay - (now - lastRun.current);
      if (remaining <= 0) {
        lastRun.current = now;
        fnRef.current(...args);
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          lastRun.current = Date.now();
          timer.current = null;
          fnRef.current(...args);
        }, remaining);
      }
    },
    [delay],
  ) as T;
}

/** 虚拟列表：长列表渲染优化 */
export interface VirtualListOptions {
  itemHeight: number;
  overscan?: number;
}

export function useVirtualList(
  total: number,
  containerHeight: number,
  options: VirtualListOptions,
) {
  const { itemHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    total - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => startIndex + i);

  return {
    visibleItems,
    totalHeight: total * itemHeight,
    offsetY: startIndex * itemHeight,
    onScroll,
  };
}

/** Web Vitals 上报 */
export function reportWebVitals(onPerf?: (metric: { name: string; value: number }) => void): void {
  try {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      onPerf?.({ name: 'LCP', value: last.startTime });
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // FID
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const e = entry as { processingStart?: number; startTime?: number };
        onPerf?.({ name: 'FID', value: (e.processingStart ?? 0) - (e.startTime ?? 0) });
      });
    }).observe({ type: 'first-input', buffered: true });

    // CLS
    let cls = 0;
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const e = entry as { hadRecentInput?: boolean; value?: number };
        if (!e.hadRecentInput) cls += e.value ?? 0;
      });
      onPerf?.({ name: 'CLS', value: cls });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* 不支持时静默 */
  }
}

export default useDebounce;
