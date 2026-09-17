/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 渐变背景：深海蓝渐变 + 柔和光斑装饰
 */
import type { CSSProperties, ReactNode } from 'react';

interface GradientBackgroundProps {
  children?: ReactNode;
  /** 是否为深色（深海蓝）背景 */
  variant?: 'dark' | 'light';
  className?: string;
  style?: CSSProperties;
}

export default function GradientBackground({
  children,
  variant = 'dark',
  className = '',
  style,
}: GradientBackgroundProps) {
  const base: CSSProperties =
    variant === 'dark'
      ? {
          background:
            'radial-gradient(1200px 600px at 80% -10%, rgba(24,144,255,0.25), transparent 60%),' +
            'radial-gradient(900px 500px at 10% 110%, rgba(19,194,194,0.18), transparent 55%),' +
            'linear-gradient(160deg, #073A6B 0%, #0A4D8C 45%, #0B5AA0 100%)',
        }
      : {
          background:
            'radial-gradient(1000px 500px at 90% 0%, rgba(24,144,255,0.10), transparent 60%),' +
            'linear-gradient(180deg, #F5F9FF 0%, #FFFFFF 100%)',
        };
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ ...base, ...style }}
      data-demo-gradient
    >
      {children}
    </div>
  );
}
