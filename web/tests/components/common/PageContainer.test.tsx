/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * PageContainer 页面容器组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import PageContainer from '@/components/common/PageContainer';

describe('PageContainer', () => {
  it('渲染标题', () => {
    render(<PageContainer title="工作台">内容</PageContainer>);
    expect(screen.getByRole('heading', { name: '工作台' })).toBeInTheDocument();
  });

  it('渲染描述', () => {
    render(<PageContainer title="标题" description="这是描述">内容</PageContainer>);
    expect(screen.getByText('这是描述')).toBeInTheDocument();
  });

  it('无描述时不渲染描述区域', () => {
    render(<PageContainer title="标题">内容</PageContainer>);
    expect(screen.queryByText('这是描述')).not.toBeInTheDocument();
  });

  it('渲染子内容', () => {
    render(
      <PageContainer title="标题">
        <div data-testid="child">子组件</div>
      </PageContainer>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('渲染操作区（extra）', () => {
    render(
      <PageContainer title="标题" extra={<button type="button">新增</button>}>
        内容
      </PageContainer>,
    );
    expect(screen.getByRole('button', { name: '新增' })).toBeInTheDocument();
  });
});
