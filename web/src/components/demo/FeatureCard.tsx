/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 功能卡片：图标 + 标题 + 描述，悬停上浮并显示顶部高亮条
 */
import type { ReactNode } from 'react';
import { clickableProps } from '../../utils/a11y';
import { DemoIcon } from './icons';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  points?: string[];
  extra?: ReactNode;
  onClick?: () => void;
}

export default function FeatureCard({
  icon,
  title,
  description,
  points,
  extra,
  onClick,
}: FeatureCardProps) {
  return (
    <div
      {...(onClick ? clickableProps(onClick) : {})}
      className="group relative flex h-full flex-col overflow-hidden rounded-jl bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span className="absolute left-0 top-0 h-[3px] w-0 bg-jl-primary transition-all duration-300 group-hover:w-full" />
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2FB] text-2xl text-jl-primary transition-colors duration-300 group-hover:bg-jl-primary group-hover:text-white">
        <DemoIcon name={icon} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#1A2B45]">{title}</h3>
      <p className="m-0 mb-3 text-sm leading-relaxed text-ink-secondary">{description}</p>
      {points && points.length > 0 ? (
        <ul className="m-0 mt-auto list-none p-0">
          {points.slice(0, 4).map((p) => (
            <li key={p} className="flex items-start gap-2 py-1 text-xs text-[#4A5B74]">
              <span className="mt-[5px] inline-block h-1.5 w-1.5 flex-none rounded-full bg-jl-cyan" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {extra ? <div className="mt-3">{extra}</div> : null}
    </div>
  );
}
