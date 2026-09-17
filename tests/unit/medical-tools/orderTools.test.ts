/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 医嘱管理工具（create_order / get_order_list / cancel_order / order_audit）
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, makeNurseContext, emptyCtx } from './helpers.js';
import { createOrderTool } from '@/medical-tools/order/createOrder.js';
import { getOrderListTool } from '@/medical-tools/order/getOrderList.js';
import { cancelOrderTool } from '@/medical-tools/order/cancelOrder.js';
import { orderAuditTool } from '@/medical-tools/order/orderAudit.js';

const doctorCtx = makeDoctorContext();
const nurseCtx = makeNurseContext();

describe('create_order 开具医嘱', () => {
  const base = {
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    orderType: '治疗' as const,
    orderContent: '心电监护q4h',
    clinicalIndication: '冠心病术后监护',
    priority: '普通' as const,
  };

  it('医师开具普通医嘱应成功', async () => {
    const res = await createOrderTool.execute(base, doctorCtx);
    expect(res.success).toBe(true);
    const data = res.data as {
      orderId: string;
      status: string;
      requiresDoubleConfirm: boolean;
      safetyCheck: { allergyAlerts: string[] };
    };
    expect(data.orderId).toBeTruthy();
    expect(data.requiresDoubleConfirm).toBe(true);
  });

  it('非医师角色开具医嘱应被拒绝', async () => {
    const res = await createOrderTool.execute(base, nurseCtx);
    expect(res.success).toBe(false);
  });

  it('不存在患者应返回错误', async () => {
    const res = await createOrderTool.execute({ ...base, patientId: 'P_NOT_EXIST' }, doctorCtx);
    expect(res.success).toBe(false);
  });

  it('药品医嘱应输出安全检查结构（过敏/相互作用/剂量）', async () => {
    const res = await createOrderTool.execute(
      { ...base, orderType: '药品', orderContent: '生理盐水250ml ivgtt' },
      doctorCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      requiresPharmacistReview: boolean;
      safetyCheck: { allergyAlerts: string[]; drugInteractions: string[] };
    };
    expect(data.requiresPharmacistReview).toBe(true);
    expect(Array.isArray(data.safetyCheck.allergyAlerts)).toBe(true);
    expect(Array.isArray(data.safetyCheck.drugInteractions)).toBe(true);
  });
});

describe('get_order_list 查询医嘱', () => {
  it('按患者ID应返回医嘱列表', async () => {
    const res = await getOrderListTool.execute({ patientId: 'P2026090001' }, emptyCtx);
    expect(res.success).toBe(true);
    const data = res.data as { total: number; orders: unknown[] };
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  it('按状态筛选', async () => {
    const res = await getOrderListTool.execute({ patientId: 'P2026090001', status: '已开立' }, emptyCtx);
    const data = res.data as { orders: { status: string }[] };
    expect(data.orders.every((o) => o.status === '已开立')).toBe(true);
  });

  it('按类型筛选', async () => {
    const res = await getOrderListTool.execute({ patientId: 'P2026090001', orderType: '药品' }, emptyCtx);
    const data = res.data as { orders: { orderType: string }[] };
    expect(data.orders.every((o) => o.orderType === '药品')).toBe(true);
  });

  it('不存在患者应返回空列表', async () => {
    const res = await getOrderListTool.execute({ patientId: 'P_NOT_EXIST' }, emptyCtx);
    const data = res.data as { total: number };
    expect(data.total).toBe(0);
  });
});

describe('cancel_order 取消医嘱', () => {
  it('取消不存在医嘱应返回错误', async () => {
    const res = await cancelOrderTool.execute(
      { orderId: 'ORDER_NOT_EXIST', patientId: 'P2026090001', reason: '测试取消', cancelType: '取消' },
      doctorCtx,
    );
    expect(res.success).toBe(false);
  });

  it('缺少取消类型应校验失败', async () => {
    await expect(
      cancelOrderTool.execute(
        { orderId: 'O1', patientId: 'P2026090001', reason: '测试' } as never,
        doctorCtx,
      ),
    ).rejects.toThrow();
  });
});

describe('order_audit 医嘱审核', () => {
  it('药师审核医嘱应返回结果', async () => {
    const list = await getOrderListTool.execute({ patientId: 'P2026090001', status: '待审核' }, emptyCtx);
    const orders = (list.data as { orders: { orderId: string }[] }).orders;
    if (orders.length > 0) {
      const res = await orderAuditTool.execute(
        { orderId: orders[0].orderId, action: 'approve', comment: '合理' },
        doctorCtx,
      );
      expect(res.success).toBe(true);
    }
  });
});
