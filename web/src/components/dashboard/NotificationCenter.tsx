/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 通知中心
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckOutlined, BellOutlined, RightOutlined } from '@ant-design/icons';
import { clsx } from 'clsx';
import type { Notification, NotificationType } from '@/types/dashboard';
import { clickableProps } from '@/utils/a11y';
import { useDashboardStore, selectUnreadCount } from '@/store/dashboardStore';

const notifTypeConfig: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  system: { icon: '⚙️', color: '#8C8C8C', bg: '#f5f5f5' },
  critical_alert: { icon: '🚨', color: '#F5222D', bg: '#fff1f0' },
  drug_interaction: { icon: '💊', color: '#FA8C16', bg: '#fff7e6' },
  consultation_invite: { icon: '👥', color: '#722ED1', bg: '#f9f0ff' },
  qc_reminder: { icon: '📋', color: '#1890FF', bg: '#e6f7ff' },
};

type NotifFilter = 'all' | NotificationType;

export const NotificationCenter: React.FC = () => {
  const notifications = useDashboardStore((s) => s.data.notifications);
  const markNotificationRead = useDashboardStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useDashboardStore((s) => s.markAllNotificationsRead);
  const unreadCount = useDashboardStore(selectUnreadCount);
  const [filter, setFilter] = useState<NotifFilter>('all');
  const navigate = useNavigate();

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const handleClick = (n: Notification) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.link) navigate(n.link);
  };

  const filters: { key: NotifFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'critical_alert', label: '危急值告警' },
    { key: 'consultation_invite', label: '会诊邀请' },
    { key: 'drug_interaction', label: '药物预警' },
    { key: 'qc_reminder', label: '质控提醒' },
    { key: 'system', label: '系统通知' },
  ];

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-sm border border-gray-100 h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <BellOutlined className="text-[#0A4D8C]" />
          <h3 className="text-base font-semibold text-gray-800">通知中心</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1 text-xs text-[#0A4D8C] hover:text-[#083d6f]"
          >
            <CheckOutlined /> 全部已读
          </button>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-gray-50">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'shrink-0 rounded-md px-2.5 py-1 text-xs transition-all whitespace-nowrap',
              filter === f.key
                ? 'bg-[#0A4D8C] text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BellOutlined className="text-4xl mb-2" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredNotifications.map((n) => {
              const cfg = notifTypeConfig[n.type];
              return (
                <li
                  key={n.id}
                  {...clickableProps(() => handleClick(n))}
                  className={clsx(
                    'flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50',
                    !n.read && 'bg-blue-50/30',
                  )}
                >
                  {/* 类型图标 */}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    {cfg.icon}
                  </span>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'text-sm truncate',
                          n.read ? 'text-gray-500' : 'font-semibold text-gray-800',
                        )}
                      >
                        {n.title}
                      </span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 truncate">{n.content}</p>
                    <span className="mt-0.5 text-xs text-gray-300">{n.time}</span>
                  </div>

                  {/* 跳转箭头 */}
                  {n.link && <RightOutlined className="mt-1.5 shrink-0 text-xs text-gray-300" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
