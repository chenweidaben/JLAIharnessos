/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 在线状态 Hook：监听 navigator.onLine 与 online/offline 事件，
 * 供断网横幅、自动重连、表单暂存等场景消费。
 *
 * 异常边界覆盖：
 *  - 断网（offline）：返回 false，UI 展示离线横幅，禁止提交类操作
 *  - 恢复（online）：返回 true，UI 自动隐藏横幅，WebSocket 自动重连
 *  - 浏览器不支持 navigator.onLine：默认按在线处理（true），避免误报
 */
import { useEffect, useState } from 'react';

function readInitialOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(readInitialOnline);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // 标签页重新可见时再校准一次（部分浏览器在线事件有延迟）
    const onVisible = () => {
      if (document.visibilityState === 'visible') setOnline(navigator.onLine);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return online;
}

export default useOnlineStatus;
