/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 检验检查类工具（order_lab_test / order_imaging_exam / view_dicom）
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, makeNurseContext } from './helpers.js';
import { orderLabTestTool } from '@/medical-tools/lab/orderLabTest.js';
import { orderImagingExamTool } from '@/medical-tools/lab/orderImagingExam.js';
import { viewDicomTool } from '@/medical-tools/lab/viewDicom.js';

const doctorCtx = makeDoctorContext();
const nurseCtx = makeNurseContext();

describe('order_lab_test 开具检验申请', () => {
  it('医师开具血常规+生化应成功并返回费用与标本要求', async () => {
    const res = await orderLabTestTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E20260912001',
        testItems: [
          { testCode: 'BLOOD_ROUTINE', urgency: '常规' },
          { testCode: 'BIOCHEMISTRY', urgency: '常规' },
        ],
        clinicalDiagnosis: '冠心病',
        priority: '常规',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      orderId: string;
      totalFee: number;
      testItems: { specimenType: string; container: string }[];
      specimenRequirements: string[];
      expectedReportTime: string;
    };
    expect(data.orderId).toBeTruthy();
    expect(data.orderId.length).toBeGreaterThan(3);
    expect(data.totalFee).toBeGreaterThan(0);
    // 血常规为EDTA抗凝血，生化为血清
    expect(data.testItems[0].specimenType).toContain('EDTA');
    expect(data.testItems[1].specimenType).toContain('血清');
    expect(data.specimenRequirements.length).toBe(2);
    expect(data.expectedReportTime).toBeTruthy();
  });

  it('非医师角色应被拒绝', async () => {
    const res = await orderLabTestTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E20260912001',
        testItems: [{ testCode: 'THYROID', urgency: '常规' }],
      },
      nurseCtx,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('LICENSE_REQUIRED');
  });

  it('未知患者应返回错误', async () => {
    const res = await orderLabTestTool.execute(
      {
        patientId: 'P_NOT_EXIST',
        encounterId: 'E1',
        testItems: [{ testCode: 'COAGULATION', urgency: '紧急' }],
      },
      doctorCtx,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('PATIENT_NOT_FOUND');
  });

  it('生化项目应给出空腹要求预警', async () => {
    const res = await orderLabTestTool.execute(
      {
        patientId: 'P2026090004',
        encounterId: 'E1',
        testItems: [{ testCode: 'BIOCHEMISTRY', urgency: '常规' }],
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { safetyCheck: { warnings: string[] } };
    expect(data.safetyCheck.warnings.some((w) => w.includes('空腹'))).toBe(true);
  });
});

describe('order_imaging_exam 开具影像检查', () => {
  it('开具胸部CT平扫应成功并返回预约时间与费用', async () => {
    const res = await orderImagingExamTool.execute(
      {
        patientId: 'P2026090002',
        encounterId: 'E20260910004',
        examType: 'CT',
        examBodyPart: '胸部',
        clinicalQuestion: '评估肺部炎症',
        contrast: false,
        urgency: '常规',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      orderId: string;
      examName: string;
      examRoom: string;
      totalFee: number;
      scheduledTime: string;
      contrastUsed: boolean;
    };
    expect(data.examName).toContain('胸部CT');
    expect(data.contrastUsed).toBe(false);
    expect(data.totalFee).toBeGreaterThan(0);
    expect(data.scheduledTime).toBeTruthy();
  });

  it('增强CT应返回造影剂与肾功能评估', async () => {
    const res = await orderImagingExamTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E20260912001',
        examType: 'CT',
        examBodyPart: '胸部',
        clinicalQuestion: '增强评估',
        contrast: true,
        urgency: '紧急',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      contrastUsed: boolean;
      safetyCheck: { contrastAllergy: string[]; renalFunction: string[] };
    };
    expect(data.contrastUsed).toBe(true);
    expect(data.safetyCheck.contrastAllergy.length).toBeGreaterThan(0);
    expect(data.safetyCheck.renalFunction.length).toBeGreaterThan(0);
  });

  it('非医师角色应被拒绝', async () => {
    const res = await orderImagingExamTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E1',
        examType: 'MRI',
        examBodyPart: '头颅',
        clinicalQuestion: '脑梗评估',
        contrast: false,
      },
      nurseCtx,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('LICENSE_REQUIRED');
  });
});

describe('view_dicom 查看DICOM元数据', () => {
  it('肺炎患者应返回胸部CT的Study与Series元数据', async () => {
    const res = await viewDicomTool.execute({ patientId: 'P2026090002' }, doctorCtx);
    expect(res.success).toBe(true);
    const data = res.data as {
      studies: {
        studyDescription: string;
        modality: string;
        totalImages: number;
        seriesList: unknown[];
        keyAnnotations: { finding: string }[];
      }[];
      note: string;
    };
    expect(data.studies.length).toBeGreaterThan(0);
    expect(data.studies[0].modality).toBe('CT');
    expect(data.studies[0].totalImages).toBeGreaterThan(0);
    expect(data.note).toContain('元数据');
  });

  it('脑梗死患者应返回头颅MRI含关键标注', async () => {
    const res = await viewDicomTool.execute({ patientId: 'P2026090005' }, doctorCtx);
    expect(res.success).toBe(true);
    const data = res.data as {
      studies: { modality: string; keyAnnotations: { finding: string }[] }[];
    };
    expect(data.studies[0].modality).toBe('MRI');
    expect(data.studies[0].keyAnnotations.some((k) => k.finding.includes('梗死'))).toBe(true);
  });

  it('按studyInstanceUid精确筛选', async () => {
    const res = await viewDicomTool.execute(
      {
        patientId: 'P2026090005',
        studyInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.301',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { studies: { studyInstanceUid: string }[] };
    expect(data.studies.length).toBe(1);
    expect(data.studies[0].studyInstanceUid).toContain('301');
  });
});
