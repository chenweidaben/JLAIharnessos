/**
 * 健澜科技 jlmedaios - 互联互通测评 API（M761）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type InteropPass = 'met' | 'partial' | 'missed';

export interface InteropIndicator {
  id: string;
  code: string;
  name: string;
  level: string;
  score: number;
  pass: InteropPass;
  description: string;
  standard: string;
  exchange: string;
}

export const INTEROP_PASS_META: Record<InteropPass, { label: string; color: string }> = {
  met: { label: '已达标', color: 'green' },
  partial: { label: '部分达标', color: 'orange' },
  missed: { label: '未达标', color: 'red' },
};

const DEMO: InteropIndicator[] = [
  {
    id: 'IO-001',
    code: 'H-1.1',
    name: '数据标准符合性',
    level: '四级甲',
    score: 92,
    pass: 'met',
    description: '遵循国家卫健委《医院信息平台共享文档架构》。',
    standard: 'HL7 FHIR R4 / 国家卫健委医院信息平台标准化数据集（3.0）。',
    exchange: '与区域健康平台日均交换 1.2 万次消息，含就诊摘要、检验报告。',
  },
];

export interface InteropListResult {
  items: InteropIndicator[];
  demo: boolean;
}

export async function fetchInteropAssessment(): Promise<InteropListResult> {
  try {
    const res = await get<{ items: InteropIndicator[] }>('/accreditation/interop-assessment');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
