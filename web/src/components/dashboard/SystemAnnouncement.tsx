/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 系统公告
 */

import { useState } from 'react';
import {
  AlertOutlined,
  ToolOutlined,
  ReadOutlined,
  TeamOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { clsx } from 'clsx';
import type { Announcement, AnnouncementType } from '@/types/dashboard';

const typeConfig: Record<
  AnnouncementType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  important: { label: '重要通知', icon: <AlertOutlined />, color: '#F5222D', bg: '#fff1f0' },
  maintenance: { label: '系统维护', icon: <ToolOutlined />, color: '#FA8C16', bg: '#fff7e6' },
  policy: { label: '政策更新', icon: <ReadOutlined />, color: '#1890FF', bg: '#e6f7ff' },
  training: { label: '培训通知', icon: <TeamOutlined />, color: '#52C41A', bg: '#f6ffed' },
};

interface SystemAnnouncementProps {
  announcements: Announcement[];
}

export const SystemAnnouncement: React.FC<SystemAnnouncementProps> = ({ announcements }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 置顶公告优先
  const sorted = [...announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-800 mb-4">系统公告</h3>
      <ul className="space-y-2">
        {sorted.map((ann) => {
          const cfg = typeConfig[ann.type];
          const expanded = expandedId === ann.id;
          return (
            <li
              key={ann.id}
              className={clsx(
                'rounded-lg border transition-all',
                ann.pinned ? 'border-red-100 bg-red-50/30' : 'border-gray-50 bg-gray-50/50',
              )}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : ann.id)}
                className="flex w-full items-start gap-3 p-3 text-left"
              >
                {/* 类型图标 */}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.icon}
                </span>

                {/* 标题区 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ann.pinned && (
                      <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        置顶
                      </span>
                    )}
                    <span
                      className={clsx(
                        'text-sm truncate',
                        ann.pinned ? 'font-semibold text-gray-800' : 'text-gray-700',
                      )}
                    >
                      {ann.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                    <span
                      className="rounded px-1 py-0.5 text-[10px]"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span>{ann.department}</span>
                    <span>{ann.publishTime}</span>
                  </div>
                </div>

                {/* 展开箭头 */}
                <DownOutlined
                  className={clsx(
                    'mt-1.5 shrink-0 text-xs text-gray-300 transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </button>

              {/* 展开内容 */}
              {expanded && (
                <div className="px-3 pb-3 pl-[52px] text-sm text-gray-500 leading-relaxed">
                  {ann.content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SystemAnnouncement;
