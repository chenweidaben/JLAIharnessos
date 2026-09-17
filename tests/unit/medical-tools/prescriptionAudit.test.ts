/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 处方审核 prescription_audit
 */

import { describe, it, expect } from 'bun:test';
import { prescriptionAuditTool } from '@medical/pharmacy/prescriptionAudit';
import { createMedicalToolContext } from './helpers';

// 说明：种子数据中仅 RX20260910002 为"待审核"，本文件用例按"先不修改状态、后修改状态"顺序编写，
// 保证对该待审核处方的校验类用例不被状态变更影响。
describe('prescription_audit', () => {
  it('驳回处方未填意见时返回 COMMENT_REQUIRED（不改变状态）', async () => {
    const ctx = createMedicalToolContext({ role: 'pharmacist' });
    const result = await prescriptionAuditTool.execute(
      { prescriptionId: 'RX20260910002', action: 'reject' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('COMMENT_REQUIRED');
  });

  it('非药师角色不可审核处方', async () => {
    const ctx = createMedicalToolContext({ role: 'doctor' });
    const result = await prescriptionAuditTool.execute(
      {
        prescriptionId: 'RX20260910002',
        action: 'approve',
        auditComment: '通过',
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ROLE_REQUIRED');
  });

  it('药师可通过待审核处方', async () => {
    const ctx = createMedicalToolContext({ role: 'pharmacist' });
    const result = await prescriptionAuditTool.execute(
      {
        prescriptionId: 'RX20260910002',
        action: 'approve',
        auditComment: '用药合理，审核通过',
      },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['currentStatus']).toBe('已审核');
    expect(data['previousStatus']).toBe('待审核');
    expect(data['auditedBy']).toBe('测试医师');
  });

  it('审核已非待审核状态的处方返回 INVALID_STATUS', async () => {
    // RX20260912001 种子数据为 已审核
    const ctx = createMedicalToolContext({ role: 'pharmacist' });
    const result = await prescriptionAuditTool.execute(
      {
        prescriptionId: 'RX20260912001',
        action: 'approve',
        auditComment: '再次审核',
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_STATUS');
  });

  it('处方不存在时返回 PRESCRIPTION_NOT_FOUND', async () => {
    const ctx = createMedicalToolContext({ role: 'pharmacist' });
    const result = await prescriptionAuditTool.execute(
      { prescriptionId: 'RX_NOT_EXIST', action: 'approve' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PRESCRIPTION_NOT_FOUND');
  });
});
