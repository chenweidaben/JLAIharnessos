/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 无障碍（a11y）工具集
 * - LiveRegion：动态内容播报区域
 * - useA11yAnnounce：播报 hook
 * - focus trap / escape close 工具
 */
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

/** 注意：addEventListener 监听的是原生 DOM KeyboardEvent；
 *  React 合成事件的 KeyboardEvent 见 clickableProps 中的 ReactKeyboardEvent 标注。 */
type DomKeyboardEvent = globalThis.KeyboardEvent;

/**
 * LiveRegion：屏幕阅读器动态播报区域
 * 使用 aria-live="polite"，内容变化时自动播报
 */
export function LiveRegion({
  message,
  assertive = false,
}: {
  message: string;
  assertive?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  );
}

/**
 * 焦点陷阱：在弹窗/模态中锁定 Tab 焦点循环
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const focusable = () =>
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );

    const handleKeyDown = (e: DomKeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}

/**
 * Esc 键关闭处理
 */
export function useEscapeKey(onEscape: () => void, active = true) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const handler = (e: DomKeyboardEvent) => {
      if (e.key === 'Escape') onEscapeRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active]);
}

/**
 * 可点击静态元素（卡片 / 列表项 / 行等）的无障碍属性集合。
 * 展开到带 onClick 的 div / li / span 上，提供 role="button"、tabIndex 与键盘触发，
 * 满足 jsx-a11y：click-events-have-key-events / no-static(-element)-interactions。
 */
export function clickableProps(handler: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    },
  };
}

/**
 * 无障碍按钮：确保按钮可聚焦且有 label
 */
export const A11yButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
> = ({ label, children, ...props }) => (
  <button type="button" aria-label={label} {...props}>
    {children}
  </button>
);

export default LiveRegion;
