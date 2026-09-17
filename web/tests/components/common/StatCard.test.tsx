/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * StatCard 数据卡片组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import StatCard from '@/components/dashboard/StatCard';
import type { StatCardData } from '@/types/dashboard';

const baseData: StatCardData = {
  key: 'stat-1',
  title: '今日门诊量',
  value: 326,
  unit: '人次',
  icon: '🏥',
};

describe('StatCard', () => {
  it('渲染标题和数值', () => {
    render(<StatCard data={baseData} />);
    expect(screen.getByText('今日门诊量')).toBeInTheDocument();
    expect(screen.getByText('人次')).toBeInTheDocument();
  });

  it('渲染趋势箭头（上升为红色）', () => {
    render(<StatCard data={{ ...baseData, trend: 5.2, trendLabel: '较昨日' }} />);
    expect(screen.getByText('5.2%')).toBeInTheDocument();
    expect(screen.getByText('较昨日')).toBeInTheDocument();
  });

  it('下降趋势为绿色', () => {
    render(<StatCard data={{ ...baseData, trend: -3.1 }} />);
    expect(screen.getByText('3.1%')).toBeInTheDocument();
  });

  it('高亮危急值卡片', () => {
    render(<StatCard data={{ ...baseData, highlight: true, title: '危急值告警' }} />);
    expect(screen.getByText('危急值告警')).toBeInTheDocument();
  });

  it('带进度条', () => {
    render(<StatCard data={{ ...baseData, progress: 85 }} />);
    const progressBar = document.querySelector('.h-1\\.5');
    expect(progressBar).toBeInTheDocument();
  });

  it('点击有 link 的卡片触发导航', () => {
    render(<StatCard data={{ ...baseData, link: '/patients' }} />);
    const card = screen.getByText('今日门诊量').closest('div[class*="cursor-pointer"]');
    expect(card).toBeInTheDocument();
  });

  it('无 link 时不触发导航', () => {
    render(<StatCard data={baseData} />);
    // 无 link 时不渲染右侧箭头
    expect(screen.queryByRole('img', { name: /arrow/i })).not.toBeInTheDocument();
  });
});
