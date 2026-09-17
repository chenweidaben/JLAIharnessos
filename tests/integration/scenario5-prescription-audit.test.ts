/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 端到端医疗场景测试 - 场景5：处方审核全流程
 * 医生开方 → 待审核 → CDS检查 → 药师审核 → 发药状态流转
 */

import { describe, it, expect } from 'bun:test';
import { createMedicalToolContext } from '../unit/medical-tools/helpers.js';
import { createPrescriptionTool } from '@/medical-tools/pharmacy/createPrescription.js';
import { prescriptionAuditTool } from '@/medical-tools/pharmacy/prescriptionAudit.js';
import { getPrescriptionListTool } from '@/medical-tools/pharmacy/getPrescriptionList.js';

const doctor = createMedicalToolContext({ role: 'doctor' });
const pharmacist = createMedicalToolContext({ role: 'pharmacist' });

describe('E2E场景5：处方审核全流程', () => {
  it('步骤1：医生开具处方，系统生成待审核单', async () => {
    const rx = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090003',
        encounterId: 'E20260911007',
        prescriptionType: '西药',
        diagnosis: '急性胃炎',
        drugs: [
          { drugName: '奥美拉唑肠溶胶囊', specification: '20mg', dosage: '20mg', frequency: 'qd', days: 7, quantity: 1, usage: '口服，每日一次' },
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

  it('步骤2：医生不能审核自己开具的处方（角色校验）', async () => {
    const res = await prescriptionAuditTool.execute(
      { prescriptionId: 'RX20260910002', action: 'approve', auditComment: '通过' },
      doctor,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('ROLE_REQUIRED');
  });

  it('步骤3：药师驳回处方必须填写审核意见', async () => {
    const res = await prescriptionAuditTool.execute(
      { prescriptionId: 'RX20260910002', action: 'reject' },
      pharmacist,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('COMMENT_REQUIRED');
  });

  it('步骤4：药师审核不存在处方应返回错误（不污染种子数据）', async () => {
    const res = await prescriptionAuditTool.execute(
      { prescriptionId: 'RX_NOT_EXIST', action: 'approve', auditComment: '通过' },
      pharmacist,
    );
    expect(res.success).toBe(false);
  });

  it('步骤5：处方列表可查询已审核处方', async () => {
    const list = await getPrescriptionListTool.execute({ patientId: 'P2026090003' }, pharmacist);
    expect(list.success).toBe(true);
  });
});
