/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 产品界面 Mockup 外框：浏览器外框（三色圆点 + 地址栏）+ 内容区
 */
import type { ReactNode } from 'react';

interface MockupFrameProps {
  children: ReactNode;
  url?: string;
  height?: number | string;
  className?: string;
}

export default function MockupFrame({
  children,
  url = 'https://demo.jianlan.tech',
  height = 360,
  className = '',
}: MockupFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[#E1E8F0] bg-white shadow-card ${className}`}
    >
      {/* 浏览器标题栏 */}
      <div className="flex items-center gap-2 border-b border-[#EEF2F7] bg-[#F6F8FB] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        <div className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-ink-secondary">
          {url}
        </div>
      </div>
      {/* 内容区 */}
      <div className="w-full overflow-auto bg-[#F5F7FA]" style={{ height }}>
        {children}
      </div>
    </div>
  );
}
