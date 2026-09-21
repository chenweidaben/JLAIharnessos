/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * FindingList：146 发现渲染 + 阳性/阴性 + critical 红色高亮 + 置信度进度条
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import FindingList from '@/components/imagingAi/FindingList';
import { buildDemoFindings } from '@/mock/imagingAi';
import type { RadarFinding } from '@/types/imagingAi';

function makeFinding(overrides: Partial<RadarFinding>): RadarFinding {
  return {
    key: '肝_肝细胞癌',
    organ_zh: '肝',
    name_zh: '肝细胞癌',
    name_en: 'Liver_Hepatocellular carcinoma',
    probability: 0.92,
    positive: true,
    tier: 'critical',
    ...overrides,
  };
}

describe('FindingList', () => {
  it('渲染全部 146 条发现', () => {
    render(<FindingList findings={buildDemoFindings()} />);
    expect(screen.getAllByTestId('finding-row')).toHaveLength(146);
  });

  it('critical 阳性发现渲染红色危急标签', () => {
    render(<FindingList findings={[makeFinding({})]} />);
    const row = screen.getByTestId('finding-row');
    expect(row.getAttribute('data-tier')).toBe('critical');
    expect(row.getAttribute('data-positive')).toBe('true');
    expect(screen.getByTestId('critical-tag')).toBeInTheDocument();
    expect(screen.getByText('阳性')).toBeInTheDocument();
  });

  it('major 阳性发现渲染橙色重要标签', () => {
    render(
      <FindingList
        findings={[makeFinding({ key: '肝_肝囊肿', name_zh: '肝囊肿', tier: 'major', probability: 0.8 })]}
      />,
    );
    expect(screen.getByTestId('major-tag')).toBeInTheDocument();
    expect(screen.getByTestId('finding-row').getAttribute('data-tier')).toBe('major');
  });

  it('阴性发现显示阴性标签、无分级标签、灰色进度', () => {
    render(
      <FindingList findings={[makeFinding({ name_zh: '脂肪肝', probability: 0.01, positive: false, tier: 'minor' })]} />,
    );
    expect(screen.getByText('阴性')).toBeInTheDocument();
    expect(screen.queryByTestId('critical-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('finding-row').getAttribute('data-positive')).toBe('false');
  });
});
