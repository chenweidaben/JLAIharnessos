/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * OrganNav：18 器官导航渲染 + 阳性数徽标 + 点击过滤
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@test-utils';
import OrganNav from '@/components/imagingAi/OrganNav';
import { RADAR_ORGAN_KEYS } from '@/mock/radarCatalogData';
import { buildDemoFindings } from '@/mock/imagingAi';

describe('OrganNav', () => {
  it('渲染全部 18 个器官（顺序固定）+ 全部器官项', () => {
    render(
      <OrganNav
        organs={RADAR_ORGAN_KEYS}
        findings={buildDemoFindings()}
        selected={null}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText('全部器官')).toBeInTheDocument();
    // 契约 §1 顺序固定的 18 器官
    for (const organ of RADAR_ORGAN_KEYS) {
      expect(screen.getByText(organ)).toBeInTheDocument();
    }
    // 18 器官 + 1 个“全部” = 19 个 List.Item
    expect(screen.getByTestId('organ-nav').querySelectorAll('.ant-list-item')).toHaveLength(19);
  });

  it('点击器官触发 onSelect（null 表示全部）', () => {
    const onSelect = vi.fn();
    render(
      <OrganNav
        organs={RADAR_ORGAN_KEYS}
        findings={buildDemoFindings()}
        selected={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText('肝'));
    expect(onSelect).toHaveBeenCalledWith('肝');
    fireEvent.click(screen.getByText('全部器官'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
