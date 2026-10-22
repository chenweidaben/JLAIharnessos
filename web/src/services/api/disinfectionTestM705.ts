/**
 * 健澜科技 jlmedaios - 消毒灭菌效果监测 API（M705）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TestStatus = 'qualified' | 'unqualified' | 'pending';

export interface DisinfectionTest {
  id: string;
  target: string;
  testType: string;
  sampledAt: string;
  result: string;
  status: TestStatus;
  method: string;
  handling: string;
}

export const TEST_STATUS_META: Record<TestStatus, { label: string; color: string }> = {
  qualified: { label: '合格', color: 'green' },
  unqualified: { label: '不合格', color: 'red' },
  pending: { label: '待出报告', color: 'orange' },
};

const DEMO: DisinfectionTest[] = [
  {
    id: 'DT-001',
    target: '手术室空气层流',
    testType: '空气培养',
    sampledAt: '2026-10-20',
    result: '126 CFU/m³',
    status: 'qualified',
    method: '沉降法 30min',
    handling: '—',
  },
  {
    id: 'DT-002',
    target: '高压蒸汽灭菌器 #3',
    testType: '生物监测',
    sampledAt: '2026-10-18',
    result: '嗜热脂肪芽孢杆菌生长',
    status: 'unqualified',
    method: 'BI 132℃ 3.5min',
    handling: '立即停用该灭菌器，检修后重新验证合格方可启用；追溯近 7 天该批次灭菌包。',
  },
];

export interface TestListResult {
  items: DisinfectionTest[];
  demo: boolean;
}

export async function fetchDisinfectionTests(): Promise<TestListResult> {
  try {
    const res = await get<{ items: DisinfectionTest[] }>('/infection/disinfection-tests');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
