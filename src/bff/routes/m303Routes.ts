/**
 * 健澜科技 jlmedaios - M303 财务域
 *
 * 收费管理/支付记录/退款记录/医保结算/预算管理/财务审计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/finance/billing - 收费管理 5 条 */
async function handleFinanceBilling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BL-001', billNo: '20261020-001', patient: '王***', item: '门诊挂号费+检查费', amount: '356.50 元', status: '已支付' },
    { id: 'BL-002', billNo: '20261020-002', patient: '李***', item: '住院预交金', amount: '10,000.00 元', status: '已支付' },
    { id: 'BL-003', billNo: '20261020-003', patient: '张***', item: '药品费（抗生素）', amount: '285.00 元', status: '已支付' },
    { id: 'BL-004', billNo: '20261020-004', patient: '赵***', item: '检查费（CT 平扫）', amount: '320.00 元', status: '待支付' },
    { id: 'BL-005', billNo: '20261020-005', patient: '孙***', item: '手术费+麻醉费', amount: '8,500.00 元', status: '已支付' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/payment - 支付记录 5 条 */
async function handleFinancePayment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAY-001', orderNo: 'ORD-20261020-001', amount: '356.50 元', method: '微信支付', time: '2026-10-20 09:15', status: '成功' },
    { id: 'PAY-002', orderNo: 'ORD-20261020-002', amount: '10,000.00 元', method: '银行转账', time: '2026-10-20 10:30', status: '成功' },
    { id: 'PAY-003', orderNo: 'ORD-20261020-003', amount: '285.00 元', method: '支付宝', time: '2026-10-20 11:00', status: '成功' },
    { id: 'PAY-004', orderNo: 'ORD-20261020-004', amount: '320.00 元', method: '医保卡', time: '2026-10-20 14:20', status: '待支付' },
    { id: 'PAY-005', orderNo: 'ORD-20261020-005', amount: '8,500.00 元', method: '银行卡（POS）', time: '2026-10-20 15:45', status: '成功' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/refund - 退款记录 5 条 */
async function handleFinanceRefund(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RF-001', originalOrder: 'ORD-20261018-001', refundAmount: '120.00 元', reason: '患者取消检查项目', status: '已退款' },
    { id: 'RF-002', originalOrder: 'ORD-20261018-002', refundAmount: '500.00 元', reason: '预交金结余退还', status: '已退款' },
    { id: 'RF-003', originalOrder: 'ORD-20261019-003', refundAmount: '85.00 元', reason: '药品退费（未取药）', status: '退款中' },
    { id: 'RF-004', originalOrder: 'ORD-20261019-004', refundAmount: '200.00 元', reason: '患者转院治疗', status: '已退款' },
    { id: 'RF-005', originalOrder: 'ORD-20261020-005', refundAmount: '350.00 元', reason: '重复收费（系统错误）', status: '待审批' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/insurance-settlement - 医保结算 5 条 */
async function handleFinanceInsuranceSettlement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IS-001', patient: '王***', totalCost: '8,500.00 元', insuranceReimb: '6,800.00 元', selfPay: '1,700.00 元', status: '已结算' },
    { id: 'IS-002', patient: '李***', totalCost: '12,000.00 元', insuranceReimb: '9,600.00 元', selfPay: '2,400.00 元', status: '已结算' },
    { id: 'IS-003', patient: '张***', totalCost: '5,200.00 元', insuranceReimb: '4,160.00 元', selfPay: '1,040.00 元', status: '已结算' },
    { id: 'IS-004', patient: '赵***', totalCost: '3,800.00 元', insuranceReimb: '2,660.00 元', selfPay: '1,140.00 元', status: '结算中' },
    { id: 'IS-005', patient: '孙***', totalCost: '15,000.00 元', insuranceReimb: '12,000.00 元', selfPay: '3,000.00 元', status: '已结算' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/budget - 预算管理 5 条 */
async function handleFinanceBudget(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { dept: '心血管内科', budget: '2,000 万元', actual: '1,850 万元', executionRate: '92.5%', status: '正常执行' },
    { dept: '普外科', budget: '1,800 万元', actual: '1,620 万元', executionRate: '90.0%', status: '正常执行' },
    { dept: '骨科', budget: '1,600 万元', actual: '1,450 万元', executionRate: '90.6%', status: '正常执行' },
    { dept: '设备采购', budget: '3,000 万元', actual: '800 万元', executionRate: '26.7%', status: '执行偏慢' },
    { dept: 'IT 信息系统', budget: '500 万元', actual: '480 万元', executionRate: '96.0%', status: '接近完成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/audit - 财务审计 5 条 */
async function handleFinanceAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FA-001', period: '2026 年 Q3', auditItem: '门诊收费合规性审计', finding: '发现 3 笔收费项目编码错误', rectification: '已通知收费处更正', status: '已闭环' },
    { id: 'FA-002', period: '2026 年 Q3', auditItem: '医保结算数据核对', finding: '医保回款与实际申报差异 0.5%', rectification: '已与医保局对账确认', status: '已闭环' },
    { id: 'FA-003', period: '2026 年 Q3', auditItem: '药品采购价格审计', finding: '部分药品采购价高于市场均价 5%', rectification: '已启动重新议价', status: '整改中' },
    { id: 'FA-004', period: '2026 年 Q2', auditItem: '固定资产盘点审计', finding: '账实相符率 98.5%', rectification: '盘盈/盘亏已入账调整', status: '已闭环' },
    { id: 'FA-005', period: '2026 年 Q3', auditItem: '退费流程合规性审计', finding: '发现 2 笔退费审批手续不全', rectification: '已要求补全审批手续', status: '整改中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m303Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/finance/billing', handle: handleFinanceBilling, auth: true },
  { method: 'GET', path: '/api/v1/finance/payment', handle: handleFinancePayment, auth: true },
  { method: 'GET', path: '/api/v1/finance/refund', handle: handleFinanceRefund, auth: true },
  { method: 'GET', path: '/api/v1/finance/insurance-settlement', handle: handleFinanceInsuranceSettlement, auth: true },
  { method: 'GET', path: '/api/v1/finance/budget', handle: handleFinanceBudget, auth: true },
  { method: 'GET', path: '/api/v1/finance/audit', handle: handleFinanceAudit, auth: true },
];
