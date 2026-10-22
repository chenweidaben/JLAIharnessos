/**
 * 健澜科技 jlmedaios - M608 医保结算
 *
 * GET  /api/v1/insurance/settlements        结算记录列表
 * POST /api/v1/insurance/settlements        发起结算
 * GET  /api/v1/insurance/pre-auths          预授权记录
 *
 * 种子：10 条结算记录（含 3 条拒付、2 条部分支付）
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type SettlementStatus = 'pending' | 'paid' | 'partial' | 'rejected';

interface Settlement {
  id: string;
  patientName: string;
  admissionNo: string;
  totalAmount: number;
  insurancePay: number;
  selfPay: number;
  status: SettlementStatus;
  settleDate: string;
  rejectReason: string | null;
}

const settlements: Settlement[] = [
  { id: 'ST001', patientName: '张*三', admissionNo: 'ADM20261018001', totalAmount: 8500, insurancePay: 6800, selfPay: 1700, status: 'paid', settleDate: '2026-10-20', rejectReason: null },
  { id: 'ST002', patientName: '李*四', admissionNo: 'ADM20261017002', totalAmount: 12000, insurancePay: 7200, selfPay: 4800, status: 'rejected', settleDate: '2026-10-21', rejectReason: '超出限定支付范围' },
  { id: 'ST003', patientName: '王*五', admissionNo: 'ADM20261016003', totalAmount: 45000, insurancePay: 38000, selfPay: 7000, status: 'paid', settleDate: '2026-10-20', rejectReason: null },
  { id: 'ST004', patientName: '赵*六', admissionNo: 'ADM20261019004', totalAmount: 68000, insurancePay: 45000, selfPay: 23000, status: 'partial', settleDate: '2026-10-21', rejectReason: '耗材超限价支付 8000' },
  { id: 'ST005', patientName: '钱*七', admissionNo: 'ADM20261020005', totalAmount: 5200, insurancePay: 0, selfPay: 0, status: 'pending', settleDate: '', rejectReason: null },
  { id: 'ST006', patientName: '孙*八', admissionNo: 'ADM20261015006', totalAmount: 95000, insurancePay: 82000, selfPay: 13000, status: 'paid', settleDate: '2026-10-19', rejectReason: null },
  { id: 'ST007', patientName: '周*九', admissionNo: 'ADM20261018007', totalAmount: 15000, insurancePay: 9000, selfPay: 6000, status: 'rejected', settleDate: '2026-10-21', rejectReason: '诊断与治疗不匹配' },
  { id: 'ST008', patientName: '吴*十', admissionNo: 'ADM20261020008', totalAmount: 9800, insurancePay: 0, selfPay: 0, status: 'pending', settleDate: '', rejectReason: null },
  { id: 'ST009', patientName: '郑*一', admissionNo: 'ADM20261014009', totalAmount: 22000, insurancePay: 18000, selfPay: 4000, status: 'partial', settleDate: '2026-10-18', rejectReason: '检查项目超频次支付 2000' },
  { id: 'ST010', patientName: '冯*二', admissionNo: 'ADM20261013010', totalAmount: 7600, insurancePay: 6200, selfPay: 1400, status: 'paid', settleDate: '2026-10-17', rejectReason: null },
];

const preAuths = [
  { id: 'PA001', patientName: '赵*六', admissionNo: 'ADM20261019004', item: '人工髋关节假体', estimatedAmount: 35000, status: 'approved', authDate: '2026-10-19' },
  { id: 'PA002', patientName: '孙*八', admissionNo: 'ADM20261015006', item: '颅内动脉瘤栓塞弹簧圈', estimatedAmount: 60000, status: 'approved', authDate: '2026-10-15' },
  { id: 'PA003', patientName: '李*四', admissionNo: 'ADM20261017002', item: '腹腔镜耗材升级包', estimatedAmount: 3500, status: 'rejected', authDate: '2026-10-18' },
];

export const m608Routes: RouteDef[] = [
  {
    path: '/api/v1/insurance/settlements',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      const status = c.query.get('status');
      let list = [...settlements];
      if (status) list = list.filter(s => s.status === status);
      return json(ok({ settlements: list, total: list.length }), 200);
    },
  },
  {
    path: '/api/v1/insurance/settlements',
    method: 'POST',
    auth: true,
    handle: async (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      let body: { admissionNo: string; totalAmount: number } | null = null;
      try { body = await c.body<{ admissionNo: string; totalAmount: number }>(); } catch { body = null; }
      if (!body || !body.admissionNo || !body.totalAmount || body.totalAmount <= 0) {
        return json({ code: 400, message: 'admissionNo and totalAmount required' }, 400);
      }
      const newId = `ST${String(settlements.length + 1).padStart(3, '0')}`;
      const s: Settlement = {
        id: newId,
        patientName: '未知',
        admissionNo: body.admissionNo,
        totalAmount: body.totalAmount,
        insurancePay: 0,
        selfPay: 0,
        status: 'pending',
        settleDate: '',
        rejectReason: null,
      };
      settlements.push(s);
      return json(ok(s), 201);
    },
  },
  {
    path: '/api/v1/insurance/pre-auths',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      return json(ok({ preAuths }), 200);
    },
  },
];
