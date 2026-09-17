/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 离线状态横幅：网络断开时顶部固定展示红色提示，
 * 网络恢复后自动消失。基于 useOnlineStatus。
 *
 * 异常边界：
 *  - 断网：展示"网络已断开，部分功能暂不可用"
 *  - 恢复：自动隐藏，并提示"网络已恢复"
 *  - 不阻断业务浏览（仅提示），提交类操作由各页面自行判断
 */
import { Alert } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const [showRecovered, setShowRecovered] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    // 从离线恢复到在线：短暂展示"已恢复"提示
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowRecovered(true);
      const t = window.setTimeout(() => setShowRecovered(false), 3000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [online]);

  if (!online) {
    return (
      <div
        role="alert"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        <Alert
          type="error"
          showIcon
          banner
          message="网络已断开"
          description="当前网络不可用，数据不会自动同步。请检查网络连接，已填写的内容会暂存本地。"
        />
      </div>
    );
  }

  if (showRecovered) {
    return (
      <div role="status" style={{ position: 'sticky', top: 0, zIndex: 1100 }}>
        <Alert type="success" showIcon banner message="网络已恢复，正在重新连接…" />
      </div>
    );
  }

  return null;
}
