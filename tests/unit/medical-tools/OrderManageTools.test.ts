/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 医嘱管理类工具（cancel_order / order_audit）
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext } from './helpers.js';
import { cancelOrderTool } from '@/medical-tools/order/cancelOrder.js';
import { orderAuditTool } from '@/medical-tools/order/orderAudit.js';

const doctorCtx = makeDoctorContext();

describe('cancel_order 取消医嘱', () => {
  it('取消执行中的普通优先级医嘱应成功', async () => {
    const res = await cancelOrderTool.execute(
      {
        orderId: 'O20260912001',
        patientId: 'P2026090001',
        reason: '患者要求调整抗血小板方案',
        cancelType: '取消',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      orderId: string;
      status: string;
      cancelTime: string;
      auditRequirement: { requiresSupervisorReview: boolean };
    };
    expect(data.status).toBe('已取消');
    expect(data.cancelTime).toBeTruthy();
    expect(data.auditRequirement.requiresSupervisorReview).toBe(false);
  });

  it('已完成的医嘱不能直接取消，应被阻止', async () => {
    const res = await cancelOrderTool.execute(
      {
        orderId: 'O20260912003',
        patientId: 'P2026090001',
        reason: '误开需取消',
        cancelType: '取消',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      status: string;
      auditRequirement: { requiresSupervisorReview: boolean; note: string };
    };
    expect(data.status).toBe('取消被阻止');
    expect(data.auditRequirement.requiresSupervisorReview).toBe(true);
    expect(data.auditRequirement.note).toContain('已执行');
  });

  it('患者ID不匹配应拒绝以防止误取消', async () => {
    const res = await cancelOrderTool.execute(
      {
        orderId: 'O20260912001',
        patientId: 'P2026090002',
        reason: '测试跨患者取消',
        cancelType: '取消',
      },
      doctorCtx,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('PATIENT_MISMATCH');
  });

  it('停止紧急医嘱应要求上级审核', async () => {
    const res = await cancelOrderTool.execute(
      {
        orderId: 'O20260910004',
        patientId: 'P2026090002',
        reason: '抗感染疗程调整',
        cancelType: '停止',
      },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      status: string;
      auditRequirement: { requiresSupervisorReview: boolean; reviewerRole: string };
    };
    expect(data.status).toBe('待上级审核');
    expect(data.auditRequirement.requiresSupervisorReview).toBe(true);
    expect(data.auditRequirement.reviewerRole).toContain('主任');
  });
});

describe('order_audit 医嘱审核', () => {
  it('通过普通药品医嘱应审核通过并返回CDS检查结果', async () => {
    const res = await orderAuditTool.execute(
      { orderId: 'O20260912001', action: 'approve', auditComment: '同意执行' },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      orderItemName: string;
      auditResult: string;
      auditStatus: string;
      cdsCheck: { drugInteractions: string[]; contraindications: string[] };
    };
    expect(data.orderItemName).toContain('阿司匹林');
    expect(data.auditResult).toBe('已通过');
    // 阿司匹林与氯吡格雷联用应检出相互作用
    expect(data.cdsCheck.drugInteractions.some((d) => d.includes('氯吡格雷'))).toBe(true);
    expect(data.cdsCheck.contraindications.length).toBe(0);
  });

  it('驳回医嘱应返回已驳回', async () => {
    const res = await orderAuditTool.execute(
      { orderId: 'O20260912002', action: 'reject', auditComment: '剂量需复核' },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { auditResult: string; auditComment: string };
    expect(data.auditResult).toBe('已驳回');
    expect(data.auditComment).toContain('剂量');
  });

  it('退回修改应返回已退回修改', async () => {
    const res = await orderAuditTool.execute(
      { orderId: 'O20260912002', action: 'return' },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { auditResult: string };
    expect(data.auditResult).toBe('已退回修改');
  });

  it('不存在的医嘱应返回错误', async () => {
    const res = await orderAuditTool.execute(
      { orderId: 'O_NOT_EXIST', action: 'approve' },
      doctorCtx,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('ORDER_NOT_FOUND');
  });
});
