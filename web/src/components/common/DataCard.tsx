/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 数据卡片：图标 / 数值 / 趋势
 */
import type { ReactNode } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import clsx from 'clsx';

interface DataCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
}

export default function DataCard({ title, value, suffix, icon, trend, trendLabel }: DataCardProps) {
  const up = (trend ?? 0) >= 0;
  return (
    <Card className="shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink-secondary">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-ink-primary">
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-normal text-ink-secondary">{suffix}</span>
            )}
          </div>
          {trend != null && (
            <div
              className={clsx(
                'mt-2 flex items-center gap-1 text-xs',
                up ? 'text-medical-normal' : 'text-medical-critical',
              )}
            >
              {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-ink-secondary">{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jl-primary/10 text-lg text-jl-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
