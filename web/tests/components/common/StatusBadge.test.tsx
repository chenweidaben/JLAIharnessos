/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * StatusBadge 状态徽章组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import StatusBadge from '@/components/common/StatusBadge';

describe('StatusBadge', () => {
  it('渲染危急状态', () => {
    render(<StatusBadge level="critical" />);
    expect(screen.getByText('危急')).toBeInTheDocument();
  });

  it('渲染异常状态', () => {
    render(<StatusBadge level="abnormal" />);
    expect(screen.getByText('异常')).toBeInTheDocument();
  });

  it('渲染正常状态', () => {
    render(<StatusBadge level="normal" />);
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('渲染待处理状态', () => {
    render(<StatusBadge level="pending" />);
    expect(screen.getByText('待处理')).toBeInTheDocument();
  });

  it('自定义文本覆盖默认', () => {
    render(<StatusBadge level="critical" text="血钾危急" />);
    expect(screen.getByText('血钾危急')).toBeInTheDocument();
  });

  it('危急状态标签为红色', () => {
    render(<StatusBadge level="critical" />);
    const tag = screen.getByText('危急').closest('.ant-tag');
    expect(tag).toHaveStyle({ backgroundColor: '#F5222D' });
  });

  it('正常状态标签为绿色', () => {
    render(<StatusBadge level="normal" />);
    const tag = screen.getByText('正常').closest('.ant-tag');
    expect(tag).toHaveStyle({ backgroundColor: '#52C41A' });
  });
});
