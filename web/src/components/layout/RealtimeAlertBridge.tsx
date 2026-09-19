/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * RealtimeAlertBridge：实时危急值告警桥接（无 UI，仅副作用）
 *
 * 订阅 WebSocket critical:alert 通道（useAlert），把到达的告警：
 *  1. 写入 dashboardStore 通知中心（顶栏铃铛未读数 +1、通知中心出现新条目）；
 *  2. 弹出右上角强提醒（危急值不自动消失，必须点击"立即处置"或手动关闭，
 *     符合医疗危急值"必知必会、闭环处置"要求）。
 *
 * 仅在登录后的主布局内挂载一次。
 */
import { useEffect, useRef } from 'react';
import { App as AntdApp, Button } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '@/hooks/useAlert';
import { useDashboardStore } from '@/store/dashboardStore';
import type { Alert } from '@/types/medical';

export default function RealtimeAlertBridge() {
  const { notification } = AntdApp.useApp();
  const { alerts } = useAlert();
  const navigate = useNavigate();
  const addNotification = useDashboardStore((s) => s.addNotification);
  // 跨渲染去重：同一条告警只处理一次（重连/重渲染不重复弹）
  const seenRef = useRef<Set<string>>(new Set());
  // 保存最新的跳转引用，避免闭包过期
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    alerts.forEach((a: Alert) => {
      if (seenRef.current.has(a.id)) return;
      seenRef.current.add(a.id);

      const patientLabel = a.patientName ? `${a.patientName}　` : '';
      const title = a.title || '危急值告警';

      // 1) 写入通知中心
      addNotification({
        id: a.id,
        type: 'critical_alert',
        title,
        content: `${patientLabel}${a.content ?? ''}`,
        time: '刚刚',
        read: false,
        link: '/alerts',
      });

      // 2) 强提醒（危急值不自动关闭）
      const key = String(a.id);
      notification.error({
        key,
        icon: <AlertOutlined className="text-red-600" />,
        message: <span className="font-semibold text-red-700">🚨 {title}</span>,
        description: (
          <div className="space-y-1">
            {a.patientName && <div className="text-xs text-gray-500">患者：{a.patientName}</div>}
            <div className="text-sm text-gray-700">{a.content}</div>
            <div className="text-xs text-red-500">需在 10 分钟内处置、双人复核并系统登记</div>
          </div>
        ),
        placement: 'topRight',
        // 生产环境危急值必须人工知晓、不自动关闭；演示/开发环境 45s 自动关闭避免堆积
        duration: import.meta.env.PROD ? 0 : 45,
        btn: (
          <Button
            type="primary"
            danger
            size="small"
            onClick={() => {
              notification.destroy(key);
              navigateRef.current('/alerts');
            }}
          >
            立即处置
          </Button>
        ),
      });
    });
  }, [alerts, addNotification, notification]);

  return null;
}
