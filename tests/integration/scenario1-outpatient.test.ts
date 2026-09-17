/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 端到端医疗场景测试 - 场景1：门诊问诊全流程
 * 挂号 → 患者信息调阅 → AI辅助问诊 → 生成病历 → 开具医嘱/处方 → CDS检查 → 审核
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, makeNurseContext } from '../unit/medical-tools/helpers.js';
import { queryPatientTool } from '@/medical-tools/patient/queryPatient.js';
import { getPatientDetailTool } from '@/medical-tools/patient/getPatientDetail.js';
import { getPatientHistoryTool } from '@/medical-tools/patient/getPatientHistory.js';
import { generateMedicalRecordTool } from '@/medical-tools/emr/generateMedicalRecord.js';
import { medicalRecordQaTool } from '@/medical-tools/emr/medicalRecordQA.js';
import { createOrderTool } from '@/medical-tools/order/createOrder.js';
import { createPrescriptionTool } from '@/medical-tools/pharmacy/createPrescription.js';
import { diagnosisSuggestionTool } from '@/medical-tools/cds/diagnosisSuggestion.js';

const doctor = makeDoctorContext();

describe('E2E场景1：门诊问诊全流程（冠心病患者）', () => {
  it('步骤1-2：挂号后查询并调阅患者档案', async () => {
    // 1. 护士站挂号/分诊后，医生按姓名检索患者
    const found = await queryPatientTool.execute({ name: '张' }, doctor);
    const patients = (found.data as { data: { patientId: string }[] }).data;
    expect(patients.length).toBeGreaterThan(0);

    // 2. 医生选中患者，调阅完整档案（自动脱敏）
    const detail = await getPatientDetailTool.execute({ patientId: 'P2026090001' }, doctor);
    expect(detail.success).toBe(true);
    const d = detail.data as { data: { idCardMasked: string; allergies: unknown[] } };
    expect(d.data.idCardMasked).toContain('*');
    // 验证过敏史被调阅，供CDS使用
    expect(d.data.allergies.length).toBeGreaterThan(0);
  });

  it('步骤3：调阅既往就诊史辅助问诊', async () => {
    const hist = await getPatientHistoryTool.execute({ patientId: 'P2026090001' }, doctor);
    expect(hist.success).toBe(true);
  });

  it('步骤4：AI基于症状给出诊断建议（CDS）', async () => {
    const diag = await diagnosisSuggestionTool.execute(
      {
        patientId: 'P2026090001',
        symptoms: ['压榨样胸痛2小时', '向左肩放射'],
        signs: ['大汗', '面色苍白'],
        labResults: [{ testName: '肌钙蛋白', value: 0.8, abnormal: true }],
      },
      doctor,
    );
    expect(diag.success).toBe(true);
    const data = diag.data as { possibleDiagnoses: { diagnosis: string }[] };
    expect(data.possibleDiagnoses.some((x) => x.diagnosis.includes('冠脉'))).toBe(true);
  });

  it('步骤5-6：医生记录问诊要点并生成病历初稿', async () => {
    const record = await generateMedicalRecordTool.execute(
      {
        patientId: 'P2026090001',
        recordType: '门诊病历',
        keyPoints: [
          { category: '主诉', content: '反复胸闷胸痛3天，加重2小时' },
          { category: '现病史', content: '活动后加重，休息后稍缓解，伴大汗' },
          { category: '体格检查', content: '心率78次/分，血压142/88mmHg，律齐' },
          { category: '诊断', content: '冠心病 不稳定型心绞痛' },
        ],
      },
      doctor,
    );
    expect(record.success).toBe(true);
    const r = record.data as { draftId: string; content: string };
    expect(r.content).toContain('胸痛');

    // 病历质控
    const qc = await medicalRecordQaTool.execute({ recordContent: r.content }, doctor);
    expect(qc.success).toBe(true);
  });

  it('步骤7：开具治疗医嘱（CDS安全检查）', async () => {
    const order = await createOrderTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E20260912001',
        orderType: '治疗',
        orderContent: '心电监护 q4h',
        clinicalIndication: '不稳定型心绞痛',
        priority: '急',
      },
      doctor,
    );
    expect(order.success).toBe(true);
  });

  it('步骤8：开具处方并经CDS检查过敏/相互作用', async () => {
    const rx = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090003',
        encounterId: 'E20260911007',
        prescriptionType: '西药',
        diagnosis: '急性胃炎',
        drugs: [
          {
            drugName: '奥美拉唑肠溶胶囊',
            specification: '20mg',
            dosage: '20mg',
            frequency: 'qd',
            days: 7,
            quantity: 1,
            usage: '口服，每日一次',
          },
        ],
      },
      doctor,
    );
    expect(rx.success).toBe(true);
    const data = rx.data as { prescriptionId: string; status: string; requiresPharmacistReview: boolean };
    expect(data.prescriptionId).toStartWith('RX');
    expect(data.status).toBe('待审核');
    expect(data.requiresPharmacistReview).toBe(true);
  });

  it('权限校验：护士不能代医生开处方', async () => {
    const nurse = makeNurseContext();
    const rx = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090003',
        encounterId: 'E20260911007',
        prescriptionType: '西药',
        diagnosis: '急性胃炎',
        drugs: [
          { drugName: '奥美拉唑', specification: '20mg', dosage: '20mg', frequency: 'qd', days: 3, quantity: 1, usage: '口服' },
        ],
      },
      nurse,
    );
    expect(rx.success).toBe(false);
  });
});
