/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * EmptyState 空状态组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import EmptyState from '@/components/common/EmptyState';

describe('EmptyState', () => {
  it('默认显示"暂无数据"', () => {
    render(<EmptyState />);
    expect(screen.getByText('暂无数据', { selector: '.ant-empty-description' })).toBeInTheDocument();
  });

  it('自定义描述', () => {
    render(<EmptyState description="暂无患者数据" />);
    expect(screen.getByText('暂无患者数据')).toBeInTheDocument();
  });

  it('渲染空状态图标', () => {
    render(<EmptyState />);
    const svg = document.querySelector('.ant-empty-image svg');
    expect(svg).toBeInTheDocument();
  });
});
