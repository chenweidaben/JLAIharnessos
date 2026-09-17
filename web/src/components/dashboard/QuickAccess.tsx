/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 快捷入口
 */

import { useNavigate } from 'react-router-dom';
import { UserOutlined, StarFilled } from '@ant-design/icons';
import type { QuickAccessItem, RecentPatient } from '@/types/dashboard';

interface QuickAccessProps {
  items: QuickAccessItem[];
  recentPatients: RecentPatient[];
}

export const QuickAccess: React.FC<QuickAccessProps> = ({ items, recentPatients }) => {
  const navigate = useNavigate();

  const handleClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-800 mb-4">快捷入口</h3>

      {/* 常用功能网格 */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => handleClick(item.path)}
            className="group flex flex-col items-center gap-1.5 rounded-lg p-3 transition-all hover:bg-gray-50"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${item.color}15` }}
            >
              {item.icon}
            </span>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
              {item.name}
            </span>
          </button>
        ))}
      </div>

      {/* 最近访问患者 */}
      <div className="mt-5 pt-4 border-t border-gray-50">
        <div className="flex items-center gap-1.5 mb-3">
          <UserOutlined className="text-xs text-gray-400" />
          <span className="text-sm font-medium text-gray-600">最近访问患者</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {recentPatients.map((p) => (
            <button
              key={p.id}
              onClick={() => handleClick(`/patients?id=${p.id}`)}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 transition-all hover:border-[#0A4D8C] hover:shadow-sm"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: p.avatarColor }}
              >
                {p.name.charAt(0)}
              </span>
              <div className="text-left">
                <div className="text-xs font-medium text-gray-800">{p.name}</div>
                <div className="text-[10px] text-gray-400">
                  {p.department} · {p.bedNumber}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 收藏工具提示 */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <StarFilled className="text-yellow-400" />
        <span>点击右上角星标可收藏常用工具到此处</span>
      </div>
    </div>
  );
};

export default QuickAccess;
