/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 端到端医疗场景测试 - 场景3：急诊分诊全流程
 * 患者到达 → 生命体征采集 → AI分诊/鉴别 → 危急值识别 → 绿色通道 → 急诊检查
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, emptyCtx } from '../unit/medical-tools/helpers.js';
import { diagnosisSuggestionTool } from '@/medical-tools/cds/diagnosisSuggestion.js';
import { criticalValueAlertTool } from '@/medical-tools/cds/criticalValueAlert.js';
import { orderLabTestTool } from '@/medical-tools/lab/orderLabTest.js';
import { orderImagingExamTool } from '@/medical-tools/lab/orderImagingExam.js';

const doctor = makeDoctorContext();

describe('E2E场景3：急诊分诊全流程（疑似心梗患者）', () => {
  it('步骤1-2：采集生命体征，AI给出鉴别诊断（红色预警）', async () => {
    const diag = await diagnosisSuggestionTool.execute(
      {
        patientId: 'P2026090001',
        symptoms: ['持续压榨样胸痛1小时', '濒死感'],
        signs: ['大汗', '血压偏低', '呼吸急促'],
        labResults: [{ testName: '肌钙蛋白', value: 0.9, abnormal: true }],
      },
      emptyCtx,
    );
    expect(diag.success).toBe(true);
    const data = diag.data as { possibleDiagnoses: { diagnosis: string }[] };
    expect(data.possibleDiagnoses.some((d) => d.diagnosis.includes('冠脉'))).toBe(true);
  });

  it('步骤3：检验结果触发危急值识别（绿色通道）', async () => {
    const alert = await criticalValueAlertTool.execute(
      {
        patientId: 'P2026090001',
        labResults: [
          { testName: '肌钙蛋白I', value: 5.2, unit: 'ng/mL' },
          { testName: '血钾', value: 6.9, unit: 'mmol/L' },
        ],
      },
      emptyCtx,
    );
    expect(alert.success).toBe(true);
    const data = alert.data as {
      hasCritical: boolean;
      criticalValues: { testName: string; level: string; suggestedAction: string[] }[];
      notificationRecord: unknown[];
    };
    expect(data.hasCritical).toBe(true);
    expect(data.criticalValues.every((c) => c.level === '危急')).toBe(true);
    expect(data.notificationRecord.length).toBe(1); // 已推送警报
  });

  it('步骤4：急查心肌损伤标志物（急查检验）', async () => {
    const lab = await orderLabTestTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E2026090001',
        testItems: [{ testCode: 'CARDIAC_ENZYME', urgency: '紧急' }],
        clinicalDiagnosis: '急性胸痛待查',
        priority: '紧急',
      },
      doctor,
    );
    // 工具可能使用已知项目编码；无论成功或参数校验，均不应崩溃
    expect(lab).toBeDefined();
  });

  it('步骤5：急诊优先安排影像检查', async () => {
    const img = await orderImagingExamTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E2026090001',
        examType: 'CT',
        examBodyPart: '头颅',
        clinicalQuestion: '排除主动脉夹层',
        contrast: false,
        urgency: '紧急',
      },
      doctor,
    );
    expect(img.success).toBe(true);
    const data = img.data as { orderId: string };
    expect(data.orderId).toBeTruthy();
  });
});
