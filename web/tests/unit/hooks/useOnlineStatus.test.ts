/**
 * 健澜科技 jlmedaios - 在线状态 Hook 测试
 * Copyright (c) 2026 健澜科技有限公司. All Rights Reserved.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

beforeEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('useOnlineStatus', () => {
  it('初始返回 navigator.onLine', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('offline 事件置为 false，online 事件恢复 true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });

  it('页面重新可见时按 navigator.onLine 校准', () => {
    const { result } = renderHook(() => useOnlineStatus());
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toBe(false);
  });
});