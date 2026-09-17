/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 数据概览卡片
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { StatCardData } from '@/types/dashboard';
import { clickableProps } from '@/utils/a11y';
import { clsx } from 'clsx';

interface StatCardProps {
  data: StatCardData;
}

/** 数字滚动动画 Hook */
function useAnimatedValue(target: number, duration = 1200): number {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (target - startValue) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayValue;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const navigate = useNavigate();
  const animatedValue = useAnimatedValue(data.value);
  const isFloat = data.value % 1 !== 0;
  const displayNum = isFloat ? animatedValue.toFixed(1) : Math.round(animatedValue).toString();

  const handleClick = useCallback(() => {
    if (data.link) navigate(data.link);
  }, [data.link, navigate]);

  const isUp = data.trend !== undefined && data.trend >= 0;
  const showTrend = data.trend !== undefined;

  return (
    <div
      {...clickableProps(handleClick)}
      className={clsx(
        'group relative cursor-pointer rounded-xl bg-white p-5 transition-all duration-300 ease-out',
        'border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-xl',
        data.highlight && 'border-red-200 bg-red-50/50',
      )}
    >
      {/* 顶部：图标 + 标题 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl leading-none">{data.icon}</span>
        {showTrend && (
          <span
            className={clsx(
              'flex items-center gap-0.5 text-xs font-medium',
              isUp ? 'text-red-500' : 'text-green-500',
            )}
          >
            {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {Math.abs(data.trend!).toFixed(1)}%
          </span>
        )}
      </div>

      {/* 数值 */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={clsx(
            'text-3xl font-bold tabular-nums tracking-tight',
            data.highlight ? 'text-red-600' : 'text-gray-800',
          )}
        >
          {displayNum}
        </span>
        {data.unit && <span className="text-sm text-gray-400">{data.unit}</span>}
      </div>

      {/* 标题 */}
      <div className="mt-1.5 text-sm text-gray-500">{data.title}</div>

      {/* 趋势标签 */}
      {showTrend && data.trendLabel && (
        <div className="mt-0.5 text-xs text-gray-400">{data.trendLabel}</div>
      )}

      {/* 进度条（床位使用率等） */}
      {data.progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-1000',
              data.progress > 90
                ? 'bg-red-500'
                : data.progress > 75
                  ? 'bg-[#0A4D8C]'
                  : 'bg-green-500',
            )}
            style={{ width: `${data.progress}%` }}
          />
        </div>
      )}

      {/* 附加信息 */}
      {data.extra && <div className="mt-2 text-xs text-gray-400">{data.extra}</div>}

      {/* 悬停时右下角箭头 */}
      {data.link && (
        <ArrowRightOutlined className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 transition-all duration-300 group-hover:opacity-100" />
      )}

      {/* 危急值闪烁光圈 */}
      {data.highlight && (
        <span className="absolute inset-0 rounded-xl border-2 border-red-300/60 animate-ping" />
      )}
    </div>
  );
};

export default StatCard;
