/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 区块标题：标题 + 副标题 + 装饰线，支持深浅两种配色
 */
import FadeInOnScroll from './FadeInOnScroll';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  /** 深色背景上使用白色文字 */
  dark?: boolean;
  align?: 'center' | 'left';
}

export default function SectionTitle({
  title,
  subtitle,
  dark = false,
  align = 'center',
}: SectionTitleProps) {
  const alignCls = align === 'center' ? 'text-center items-center' : 'text-left items-start';
  return (
    <FadeInOnScroll className={`flex flex-col gap-3 ${alignCls}`}>
      <div className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
        <span className="inline-block h-[3px] w-8 rounded-full bg-jl-primary" />
        <h2
          className={`m-0 text-3xl font-bold leading-tight ${dark ? 'text-white' : 'text-[#1A2B45]'}`}
        >
          {title}
        </h2>
        <span className="inline-block h-[3px] w-8 rounded-full bg-jl-primary" />
      </div>
      {subtitle ? (
        <p
          className={`m-0 max-w-2xl text-base leading-relaxed ${dark ? 'text-white/75' : 'text-ink-secondary'}`}
        >
          {subtitle}
        </p>
      ) : null}
    </FadeInOnScroll>
  );
}
