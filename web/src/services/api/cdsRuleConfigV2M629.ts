/**
 * 健澜科技 jlmedaios - CDS 规则配置 v2 API（M629，P0 合规）
 *
 * 对接 BFF：GET /api/v1/cds/rules + POST /api/v1/cds/rules
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type CdsRuleType = 'drug_interaction' | 'lab_abnormal' | 'duplicate_therapy' | 'dose_exceeded';

export interface CdsRule {
  id: string;
  ruleCode: string;
  name: string;
  type: CdsRuleType;
  priority: number;
  enabled: boolean;
  description: string;
}

export interface CdsRuleCreateInput {
  name: string;
  type: CdsRuleType;
  priority: number;
  description: string;
}

const DEMO_RULES: CdsRule[] = [
  { id: 'CR-001', ruleCode: 'WARFARIN_ASPIRIN_BLEEDING', name: '华法林+阿司匹林出血风险', type: 'drug_interaction', priority: 90, enabled: true, description: '华法林与阿司匹林联用警示严重出血风险。' },
  { id: 'CR-002', ruleCode: 'SIMVA_CLARITH_RHABDO', name: '辛伐他汀+克拉霉素横纹肌溶解', type: 'drug_interaction', priority: 85, enabled: true, description: 'CYP3A4 强抑制剂联用导致横纹肌溶解风险。' },
  { id: 'CR-003', ruleCode: 'HYPERKALEMIA_K_GT_5_5', name: '血钾 > 5.5 mmol/L 危急值', type: 'lab_abnormal', priority: 95, enabled: true, description: '慢性肾病患者高钾血症危急值拦截。' },
  { id: 'CR-004', ruleCode: 'DUPLICATE_NSAID', name: 'NSAID 重复用药', type: 'duplicate_therapy', priority: 60, enabled: false, description: '同类 NSAID 重复开具提醒。' },
];

export interface CdsRuleListResult {
  items: CdsRule[];
  totalCount: number;
  demo: boolean;
}

export async function fetchCdsRules(): Promise<CdsRuleListResult> {
  try {
    const res = await get<{ items: CdsRule[]; totalCount: number }>('/cds/rules');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_RULES, totalCount: DEMO_RULES.length, demo: true };
  }
}

export async function createCdsRule(input: CdsRuleCreateInput): Promise<CdsRule> {
  return post<CdsRule>('/cds/rules', input);
}
