/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 页面容器：标题 / 描述 / 操作区
 */
import type { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
}

export default function PageContainer({ title, description, extra, children }: PageContainerProps) {
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink-primary">{title}</h2>
          {description && <p className="mt-1 mb-0 text-sm text-ink-secondary">{description}</p>}
        </div>
        {extra && <div className="flex items-center gap-2">{extra}</div>}
      </div>
      {children}
    </div>
  );
}
