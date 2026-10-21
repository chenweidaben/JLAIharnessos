/**
 * 健澜科技 jlmedaios - CDS 临床决策支持 API（M543，P0）
 *
 * 对接真实 BFF：POST /api/v1/cds/checks
 *   body：patientId/visitId/medications[{drugCode,dose,unit,frequency}]/
 *         labs{na,k,creatinine,wbc,platelet,hgb}/age/weight/gender/diagnoses[]
 *   响应：{patientId,visitId,alerts[{level,category,message,suggestion,references}],ruleCount,checkedAt}
 * 后端 message/suggestion 为英文规则码原文，前端仅 category/level 做中文映射；
 * BFF 不可用降级本地三档 DEMO alerts 并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { post } from '../request';

export type CdsAlertLevel = 'critical' | 'warning' | 'info';

export type CdsAlertCategory =
  | 'drug_interaction'
  | 'dose_range'
  | 'lab_abnormal'
  | 'duplicate_order'
  | 'contraindication';

export const CDS_ALERT_LEVEL_META: Record<CdsAlertLevel, { label: string; antdType: 'error' | 'warning' | 'info' }> = {
  critical: { label: '阻断级', antdType: 'error' },
  warning: { label: '警告级', antdType: 'warning' },
  info: { label: '提示级', antdType: 'info' },
};

export const CDS_CATEGORY_META: Record<CdsAlertCategory, string> = {
  drug_interaction: '药物相互作用',
  dose_range: '剂量越界',
  lab_abnormal: '异常检验',
  duplicate_order: '重复医嘱',
  contraindication: '禁忌',
};

export const DRUG_LABEL: Record<string, string> = {
  warfarin: '华法林',
  aspirin: '阿司匹林',
  simvastatin: '辛伐他汀',
  clarithromycin: '克拉霉素',
  metformin: '二甲双胍',
};

export const LAB_META: Record<string, { label: string; unit: string }> = {
  na: { label: '血钠 Na', unit: 'mmol/L' },
  k: { label: '血钾 K', unit: 'mmol/L' },
  creatinine: { label: '肌酐 Cr', unit: 'μmol/L' },
  wbc: { label: '白细胞 WBC', unit: '×10⁹/L' },
  platelet: { label: '血小板 PLT', unit: '×10⁹/L' },
  hgb: { label: '血红蛋白 HGB', unit: 'g/L' },
};

export interface CdsMedication {
  drugCode: string;
  dose: string;
  unit: string;
  frequency: string;
}

export interface CdsLabs {
  na?: number;
  k?: number;
  creatinine?: number;
  wbc?: number;
  platelet?: number;
  hgb?: number;
}

export interface CdsAlert {
  level: CdsAlertLevel;
  category: CdsAlertCategory;
  message: string;
  suggestion: string;
  references: string[];
}

export interface CdsCheckRequest {
  patientId: string;
  visitId: string;
  medications: CdsMedication[];
  labs: CdsLabs;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  diagnoses: string[];
}

export interface CdsCheckResult {
  patientId: string;
  visitId: string;
  alerts: CdsAlert[];
  ruleCount: number;
  checkedAt: string;
  demo?: boolean;
}

/** 本地 DEMO 演示上下文（warfarin+aspirin 双用药、k=6.1 高钾） */
export const DEMO_CONTEXT: CdsCheckRequest = {
  patientId: 'P10001',
  visitId: 'V-001',
  medications: [
    { drugCode: 'warfarin', dose: '5', unit: 'mg', frequency: 'qd' },
    { drugCode: 'aspirin', dose: '100', unit: 'mg', frequency: 'qd' },
  ],
  labs: { na: 138, k: 6.1, creatinine: 95, wbc: 6.5, platelet: 220, hgb: 135 },
  age: 68,
  weight: 70,
  gender: 'male',
  diagnoses: ['hypertension'],
};

function demoResult(input: CdsCheckRequest): CdsCheckResult {
  return {
    patientId: input.patientId,
    visitId: input.visitId,
    ruleCount: 17,
    checkedAt: new Date().toISOString(),
    demo: true,
    alerts: [
      {
        level: 'critical',
        category: 'drug_interaction',
        message: 'warfarin_aspirin_bleeding_risk',
        suggestion: 'avoid combination; monitor INR; consider replacing aspirin with PPI if indicated',
        references: ['ACC 2020 Anticoagulation Guideline', 'Warfarin Package Insert'],
      },
      {
        level: 'critical',
        category: 'lab_abnormal',
        message: 'hyperkalemia_k_gt_5_5',
        suggestion: 'urgent ECG; calcium gluconate + insulin/dextrose; evaluate dialysis if refractory',
        references: ['KDIGO 2019 CKD Guideline'],
      },
    ],
  };
}

export async function runCdsCheck(input: CdsCheckRequest): Promise<CdsCheckResult> {
  try {
    const res = await post<CdsCheckResult>('/cds/checks', input);
    return { ...res, demo: false };
  } catch {
    return demoResult(input);
  }
}
