/**
 * 健澜科技 jlmedaios - 互联互通测评清单 API（M657，配套 M585）
 *
 * 对接 BFF：GET /api/v1/interop/checklist
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CheckStatus = 'passed' | 'partial' | 'failed' | 'pending';

export interface InteropCheckItem {
  id: string;
  category: string;
  item: string;
  score: number;
  maxScore: number;
  status: CheckStatus;
  evidence: string;
}

export const CHECK_STATUS_META: Record<CheckStatus, { label: string; color: string }> = {
  passed: { label: '达标', color: 'green' },
  partial: { label: '部分达标', color: 'orange' },
  failed: { label: '未达标', color: 'red' },
  pending: { label: '待测评', color: 'default' },
};

const DEMO_ITEMS: InteropCheckItem[] = [
  { id: 'IC-001', category: '数据标准化', item: 'ICD-10 诊断编码映射率 ≥ 95%', score: 98, maxScore: 100, status: 'passed', evidence: 'EMPI + 字典映射自动审核月报' },
  { id: 'IC-002', category: '数据标准化', item: 'LOINC 检验编码映射率 ≥ 90%', score: 92, maxScore: 100, status: 'passed', evidence: 'LIS 接口映射报告' },
  { id: 'IC-003', category: '平台服务', item: 'CDSS 合理用药预警覆盖率', score: 75, maxScore: 100, status: 'partial', evidence: '门诊处方覆盖 75%，住院待扩展' },
  { id: 'IC-004', category: '平台服务', item: '患者主索引（EMPI）跨院合并', score: 100, maxScore: 100, status: 'passed', evidence: '已合并 32,500 例跨院患者' },
  { id: 'IC-005', category: '基础设施', item: 'FHIR R4 网关对外服务', score: 60, maxScore: 100, status: 'partial', evidence: 'Patient/Observation 已上线，Coverage 待发布' },
  { id: 'IC-006', category: '基础设施', item: '数据脱敏与权限控制', score: 0, maxScore: 100, status: 'pending', evidence: '待第三方测评机构进场' },
];

export interface InteropListResult {
  items: InteropCheckItem[];
  totalScore: number;
  maxScore: number;
  demo: boolean;
}

export async function fetchInteropChecklist(): Promise<InteropListResult> {
  try {
    const res = await get<{ items: InteropCheckItem[] }>('/interop/checklist');
    const totalScore = res.items.reduce((acc, i) => acc + i.score, 0);
    const maxScore = res.items.reduce((acc, i) => acc + i.maxScore, 0);
    return { items: res.items, totalScore, maxScore, demo: false };
  } catch {
    const totalScore = DEMO_ITEMS.reduce((acc, i) => acc + i.score, 0);
    const maxScore = DEMO_ITEMS.reduce((acc, i) => acc + i.maxScore, 0);
    return { items: DEMO_ITEMS, totalScore, maxScore, demo: true };
  }
}
