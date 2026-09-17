/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * LabResultItem 检验结果组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import LabResultRow from '@/components/medical/LabResultItem';
import type { LabResultItem } from '@/types/medical';

function makeItem(overrides?: Partial<LabResultItem>): LabResultItem {
  return {
    id: 'lab-1',
    reportId: 'rpt-1',
    itemCode: 'GLU',
    itemName: '空腹血糖',
    value: '8.6',
    unit: 'mmol/L',
    refRange: '3.9-6.1',
    level: 'abnormal',
    sampleTime: '2026-09-16T07:30:00+08:00',
    ...overrides,
  };
}

describe('LabResultRow', () => {
  it('渲染项目名称和参考区间', () => {
    render(<LabResultRow item={makeItem()} />);
    expect(screen.getByText('空腹血糖')).toBeInTheDocument();
    expect(screen.getByText(/参考区间 3\.9-6\.1/)).toBeInTheDocument();
  });

  it('渲染数值和单位', () => {
    render(<LabResultRow item={makeItem()} />);
    expect(screen.getByText('8.6')).toBeInTheDocument();
    expect(screen.getByText('mmol/L')).toBeInTheDocument();
  });

  it('危急值显示危急徽章', () => {
    render(<LabResultRow item={makeItem({ level: 'critical', value: '6.8' })} />);
    expect(screen.getByText('危急')).toBeInTheDocument();
  });

  it('正常结果显示正常徽章', () => {
    render(<LabResultRow item={makeItem({ level: 'normal', value: '5.0' })} />);
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('无单位时不渲染单位', () => {
    render(<LabResultRow item={makeItem({ unit: undefined })} />);
    expect(screen.queryByText('mmol/L')).not.toBeInTheDocument();
  });

  it('无参考区间时显示 --', () => {
    render(<LabResultRow item={makeItem({ refRange: undefined })} />);
    expect(screen.getByText(/参考区间 --/)).toBeInTheDocument();
  });
});
