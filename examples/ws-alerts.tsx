/**
 * 健澜科技数智医院智能体 - 示例：WebSocket 告警订阅
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect } from 'react';
import { useAlert } from '@/services/websocket';

export function AlertCenter() {
  const { alerts, latest, ack, clearAcknowledged } = useAlert();

  useEffect(() => {
    if (latest && latest.level === 'critical') {
      // 可在此播放提示音 / 顶部弹 banner
      console.warn('危急告警：', latest.message);
    }
  }, [latest]);

  return (
    <ul>
      {alerts.map((a) => (
        <li key={a.id} onClick={() => ack(a.id)} style={{ opacity: a.acknowledged ? 0.5 : 1 }}>
          [{a.level}] {a.ruleName} - {a.message}
        </li>
      ))}
      <button onClick={clearAcknowledged}>清空已确认</button>
    </ul>
  );
}
