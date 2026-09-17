/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 电子病历工具（get_medical_record / generate_medical_record / medical_record_qa / get_medical_template）
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, makeNurseContext, emptyCtx } from './helpers.js';
import { getMedicalRecordTool } from '@/medical-tools/emr/getMedicalRecord.js';
import { generateMedicalRecordTool } from '@/medical-tools/emr/generateMedicalRecord.js';
import { medicalRecordQaTool } from '@/medical-tools/emr/medicalRecordQA.js';
import { getMedicalTemplateTool } from '@/medical-tools/emr/getMedicalTemplate.js';

const ctx = makeDoctorContext();
const nurseCtx = makeNurseContext();

describe('get_medical_record 获取病历', () => {
  it('按患者ID应返回病历列表', async () => {
    const res = await getMedicalRecordTool.execute({ patientId: 'P2026090001' }, emptyCtx);
    expect(res.success).toBe(true);
    const data = res.data as { records: { recordId: string; content: string }[] };
    expect(data.records.length).toBeGreaterThan(0);
    expect(data.records[0].content.length).toBeGreaterThan(0);
  });

  it('按文书类型筛选', async () => {
    const res = await getMedicalRecordTool.execute(
      { patientId: 'P2026090001', recordType: '入院记录' },
      emptyCtx,
    );
    const data = res.data as { records: { recordType: string }[] };
    expect(data.records.every((r) => r.recordType === '入院记录')).toBe(true);
  });

  it('不存在患者应返回空列表', async () => {
    const res = await getMedicalRecordTool.execute({ patientId: 'P_NOT_EXIST' }, emptyCtx);
    const data = res.data as { records: unknown[] };
    expect(data.records.length).toBe(0);
  });

  it('按就诊ID筛选', async () => {
    const res = await getMedicalRecordTool.execute(
      { patientId: 'P2026090001', encounterId: 'E20260912001' },
      emptyCtx,
    );
    expect(res.success).toBe(true);
  });
});

describe('generate_medical_record AI生成病历初稿', () => {
  const baseInput = {
    patientId: 'P2026090001',
    recordType: '门诊病历',
    keyPoints: [
      { category: '主诉', content: '胸闷胸痛3天' },
      { category: '现病史', content: '活动后加重，休息可缓解' },
      { category: '体格检查', content: '心率72次/分，血压138/85' },
    ],
  };

  it('医师生成病历应成功返回草稿', async () => {
    const res = await generateMedicalRecordTool.execute(baseInput, ctx);
    expect(res.success).toBe(true);
    const data = res.data as {
      draftId: string;
      content: string;
      missingInfo: { field: string }[];
      confidence: number;
    };
    expect(data.draftId).toBeTruthy();
    expect(data.content).toContain('胸闷');
    expect(data.confidence).toBeGreaterThan(0);
  });

  it('生成结果应包含质控提示', async () => {
    const res = await generateMedicalRecordTool.execute(baseInput, ctx);
    const data = res.data as { qualityTips: string[] };
    expect(Array.isArray(data.qualityTips)).toBe(true);
  });

  it('要点缺失时应提示补充建议', async () => {
    const res = await generateMedicalRecordTool.execute(
      { patientId: 'P2026090001', recordType: '门诊病历', keyPoints: [{ category: '主诉', content: '头痛' }] },
      ctx,
    );
    const data = res.data as { missingInfo: { suggestion: string }[] };
    expect(data.missingInfo.length).toBeGreaterThan(0);
  });

  it('非医师角色生成病历应返回草稿（不阻止，但需医生确认归档）', async () => {
    const res = await generateMedicalRecordTool.execute(baseInput, nurseCtx);
    // 生成阶段为草稿，由后续医生确认环节把关
    expect(res.success).toBe(true);
  });
});

describe('medical_record_qa 病历质控', () => {
  it('传入病历内容应返回质控得分与问题列表', async () => {
    const res = await medicalRecordQaTool.execute(
      { recordContent: '主诉：胸痛3天。现病史：活动后加重。' },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { qcScore: number; issues: unknown[] };
    expect(data.qcScore).toBeGreaterThanOrEqual(0);
    expect(data.qcScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(data.issues)).toBe(true);
  });

  it('传入短病历应返回质控结果结构', async () => {
    const res = await medicalRecordQaTool.execute(
      { recordContent: '主诉：胸痛。现病史：无。' },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { qcScore: number; issues: unknown[] };
    expect(typeof data.qcScore).toBe('number');
    expect(Array.isArray(data.issues)).toBe(true);
  });
});

describe('get_medical_template 病历模板', () => {
  it('应返回模板列表', async () => {
    const res = await getMedicalTemplateTool.execute({ recordType: '入院记录' }, emptyCtx);
    expect(res.success).toBe(true);
  });

  it('无类型筛选应返回全部模板', async () => {
    const res = await getMedicalTemplateTool.execute({}, emptyCtx);
    expect(res.success).toBe(true);
  });
});
