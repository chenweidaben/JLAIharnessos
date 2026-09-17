/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - CDS 临床工具（诊断建议 / 治疗方案建议 / 危急值预警）
 */

import { describe, it, expect } from 'bun:test';
import type { MedicalToolContext } from '@/medical-tools/types.js';
import { diagnosisSuggestionTool } from '@/medical-tools/cds/diagnosisSuggestion.js';
import { treatmentPlanSuggestionTool } from '@/medical-tools/cds/treatmentPlanSuggestion.js';
import { criticalValueAlertTool } from '@/medical-tools/cds/criticalValueAlert.js';

const ctx = {} as MedicalToolContext;

describe('diagnosis_suggestion 诊断建议', () => {
  it('胸痛+肌钙蛋白应给出急性冠脉综合征等鉴别诊断', async () => {
    const res = await diagnosisSuggestionTool.execute(
      {
        patientId: 'P001',
        symptoms: ['压榨样胸痛2小时'],
        signs: ['大汗'],
        labResults: [{ testName: '肌钙蛋白', value: 0.8, abnormal: true }],
      },
      ctx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      possibleDiagnoses: { diagnosis: string; probability: string }[];
      differentialDiagnosis: unknown[];
      disclaimer: string;
    };
    expect(data.possibleDiagnoses.length).toBeGreaterThanOrEqual(1);
    expect(data.possibleDiagnoses.some((d) => d.diagnosis.includes('冠脉'))).toBe(true);
    expect(data.differentialDiagnosis.length).toBeGreaterThanOrEqual(1);
    expect(data.disclaimer).toContain('仅供参考');
  });

  it('发热+咳嗽应提示肺炎方向', async () => {
    const res = await diagnosisSuggestionTool.execute(
      { symptoms: ['发热3天', '咳嗽咳痰'] },
      ctx,
    );
    const data = res.data as { possibleDiagnoses: { diagnosis: string }[] };
    expect(data.possibleDiagnoses.some((d) => d.diagnosis.includes('肺炎'))).toBe(true);
  });
});

describe('treatment_plan_suggestion 治疗方案建议', () => {
  it('肺炎且青霉素过敏应给出替代抗菌方案', async () => {
    const res = await treatmentPlanSuggestionTool.execute(
      {
        diagnosis: '社区获得性肺炎',
        severity: '中度',
        allergies: ['青霉素'],
      },
      ctx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      pharmacological: { drugName: string }[];
      followupPlan: { followupTime: string };
      disclaimer: string;
    };
    expect(data.pharmacological.some((d) => d.drugName.includes('阿奇'))).toBe(true);
    expect(data.followupPlan.followupTime).toBeTruthy();
    expect(data.disclaimer).toContain('仅供参考');
  });

  it('冠心病应给出二级预防药物', async () => {
    const res = await treatmentPlanSuggestionTool.execute(
      { diagnosis: '冠心病 不稳定型心绞痛', severity: '中度' },
      ctx,
    );
    const data = res.data as { pharmacological: { drugName: string }[] };
    expect(data.pharmacological.some((d) => d.drugName.includes('阿司匹林'))).toBe(true);
  });
});

describe('critical_value_alert 危急值预警', () => {
  it('血钾6.8/血糖2.0/肌钙蛋白5.2 应识别为危急值', async () => {
    const res = await criticalValueAlertTool.execute(
      {
        patientId: 'P001',
        labResults: [
          { testName: '血钾', value: 6.8, unit: 'mmol/L', refLow: 3.5, refHigh: 5.5 },
          { testName: '血糖', value: 2.0, unit: 'mmol/L' },
          { testName: '肌钙蛋白', value: 5.2, unit: 'ng/mL' },
        ],
      },
      ctx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      hasCritical: boolean;
      criticalValues: { testName: string; level: string; suggestedAction: string[] }[];
      notificationRecord: unknown[];
      disclaimer: string;
    };
    expect(data.hasCritical).toBe(true);
    expect(data.criticalValues.length).toBeGreaterThanOrEqual(3);
    expect(data.criticalValues.every((c) => c.level === '危急')).toBe(true);
    expect(data.notificationRecord.length).toBe(1);
  });

  it('正常检验值不应触发危急值', async () => {
    const res = await criticalValueAlertTool.execute(
      {
        patientId: 'P001',
        labResults: [{ testName: '血钾', value: 4.2, unit: 'mmol/L' }],
      },
      ctx,
    );
    const data = res.data as { hasCritical: boolean; criticalValues: unknown[] };
    expect(data.hasCritical).toBe(false);
    expect(data.criticalValues.length).toBe(0);
  });
});
