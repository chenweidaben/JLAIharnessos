/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 端到端医疗场景测试 - 场景2：住院查房全流程
 * 患者列表 → 选择患者 → 调阅病历/检验/医嘱 → AI查房建议 → 查房记录 → 新开医嘱
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, emptyCtx } from '../unit/medical-tools/helpers.js';
import { queryPatientTool } from '@/medical-tools/patient/queryPatient.js';
import { getPatientDetailTool } from '@/medical-tools/patient/getPatientDetail.js';
import { getOrderListTool } from '@/medical-tools/order/getOrderList.js';
import { getMedicalRecordTool } from '@/medical-tools/emr/getMedicalRecord.js';
import { viewDicomTool } from '@/medical-tools/lab/viewDicom.js';
import { generateMedicalRecordTool } from '@/medical-tools/emr/generateMedicalRecord.js';

const doctor = makeDoctorContext();

describe('E2E场景2：住院查房全流程（肺炎术后患者）', () => {
  it('步骤1：医生从在院患者列表选择患者', async () => {
    const list = await queryPatientTool.execute({ patientId: 'P2026090002' }, doctor);
    expect(list.success).toBe(true);
    const data = list.data as { total: number };
    expect(data.total).toBe(1);
  });

  it('步骤2：切换患者上下文，调阅档案与生命体征', async () => {
    const detail = await getPatientDetailTool.execute({ patientId: 'P2026090002' }, doctor);
    expect(detail.success).toBe(true);
    const d = detail.data as { data: { latestVitals: { spo2: number | null } } };
    expect(typeof d.data.latestVitals.spo2).toBe('number');
  });

  it('步骤3：调阅当前医嘱与病历', async () => {
    const orders = await getOrderListTool.execute({ patientId: 'P2026090002' }, emptyCtx);
    expect(orders.success).toBe(true);
    const records = await getMedicalRecordTool.execute({ patientId: 'P2026090002' }, emptyCtx);
    expect(records.success).toBe(true);
  });

  it('步骤4：调阅影像用于查房阅片', async () => {
    const img = await viewDicomTool.execute({ patientId: 'P2026090002' }, doctor);
    expect(img.success).toBe(true);
    const data = img.data as { studies: { modality: string }[] };
    expect(data.studies[0].modality).toBe('CT');
  });

  it('步骤5-6：生成查房病程记录', async () => {
    const note = await generateMedicalRecordTool.execute(
      {
        patientId: 'P2026090002',
        recordType: '病程记录',
        keyPoints: [
          { category: '体格检查', content: '体温37.2℃，双肺呼吸音清，啰音较前减少' },
          { category: '辅助检查', content: '血常规白细胞较前下降' },
          { category: '处理', content: '继续当前抗感染方案，明日复查胸部CT' },
        ],
      },
      doctor,
    );
    expect(note.success).toBe(true);
    const n = note.data as { recordType: string; content: string };
    expect(n.recordType).toBe('病程记录');
    expect(n.content).toContain('体温');
  });
});
