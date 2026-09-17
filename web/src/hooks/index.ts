/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 自定义 Hooks
 */
import { useEffect, useState } from 'react';

import { env } from '@/utils/config';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${env.appTitle}` : env.appTitle;
  }, [title]);
}

export { default as useOnlineStatus } from './useOnlineStatus';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** 异步数据加载 Hook */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((res) => {
        if (!cancelled) setState({ data: res, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: e });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
