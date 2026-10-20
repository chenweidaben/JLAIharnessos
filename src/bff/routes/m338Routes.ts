/**
 * 健澜科技 jlmedaios - M338 门诊 + 住院域
 *
 * 门诊就诊/门诊处方/门诊分诊（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/outpatient/visits - 门诊就诊 5 条 */
async function handleOutpatientVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OV-001', visitNo: 'VIS-2026-000001', patient: '张***（男，65 岁，高血压复诊）', department: '心内科门诊', doctor: '李***（心内科主治医师）', time: '2026-10-20 08:30:00' },
    { id: 'OV-002', visitNo: 'VIS-2026-000002', patient: '王***（女，58 岁，糖尿病复诊）', department: '内分泌科门诊', doctor: '陈***（内分泌科副主任医师）', time: '2026-10-20 09:00:00' },
    { id: 'OV-003', visitNo: 'VIS-2026-000003', patient: '刘***（男，72 岁，脑卒中后康复咨询）', department: '神经内科门诊', doctor: '赵***（神经内科主任医师）', time: '2026-10-20 09:30:00' },
    { id: 'OV-004', visitNo: 'VIS-2026-000004', patient: '孙***（女，45 岁，甲状腺结节复查）', department: '普外科门诊', doctor: '周***（普外科副主任医师）', time: '2026-10-20 10:00:00' },
    { id: 'OV-005', visitNo: 'VIS-2026-000005', patient: '吴***（男，60 岁，慢阻肺复诊）', department: '呼吸内科门诊', doctor: '郑***（呼吸内科主任医师）', time: '2026-10-20 10:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/outpatient/prescriptions - 门诊处方 5 条 */
async function handleOutpatientPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OP-001', prescriptionNo: 'RX-2026-INT-000001', patient: '张***（男，65 岁，高血压复诊）', drugs: '硝苯地平缓释片 20mg × 30 片（每日 1 次，每次 1 片）', amount: '15.00 元', status: '已审核（药房已调配）' },
    { id: 'OP-002', prescriptionNo: 'RX-2026-INT-000002', patient: '王***（女，58 岁，糖尿病复诊）', drugs: '二甲双胍缓释片 0.5g × 60 片（每日 2 次，每次 1 片）', amount: '20.00 元', status: '已审核（药房已调配）' },
    { id: 'OP-003', prescriptionNo: 'RX-2026-INT-000003', patient: '刘***（男，72 岁，脑卒中后康复）', drugs: '阿司匹林肠溶片 100mg × 30 片（每日 1 次，每次 1 片）+ 阿托伐他汀钙片 20mg × 14 片（每晚 1 次，每次 1 片）', amount: '45.00 元', status: '待审核' },
    { id: 'OP-004', prescriptionNo: 'RX-2026-INT-000004', patient: '孙***（女，45 岁，甲状腺结节随访）', drugs: '左甲状腺素钠片 50μg × 100 片（每日 1 次，每次 1 片）', amount: '30.00 元', status: '已审核（药房已调配）' },
    { id: 'OP-005', prescriptionNo: 'RX-2026-INT-000005', patient: '吴***（男，60 岁，慢阻肺复诊）', drugs: '布地奈德福莫特罗吸入剂 160/4.5μg × 1 支（每日 2 次，每次 1 吸）', amount: '180.00 元', status: '已审核（药房已调配）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/outpatient/triage - 门诊分诊 5 条 */
async function handleOutpatientTriage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OT-001', patient: '张***（男，65 岁，高血压复诊）', department: '心内科门诊', triageLevel: '普通（常规复诊，无紧急情况）', nurse: '王***（门诊分诊护士）', time: '2026-10-20 08:15:00' },
    { id: 'OT-002', patient: '王***（女，58 岁，糖尿病复诊）', department: '内分泌科门诊', triageLevel: '普通（常规复诊，无紧急情况）', nurse: '王***（门诊分诊护士）', time: '2026-10-20 08:45:00' },
    { id: 'OT-003', patient: '刘***（男，72 岁，头晕加重 2 天）', department: '神经内科门诊', triageLevel: '优先（头晕加重，需优先就诊，排除脑血管意外）', nurse: '李***（门诊分诊护士）', time: '2026-10-20 09:15:00' },
    { id: 'OT-004', patient: '孙***（女，45 岁，甲状腺结节复查）', department: '普外科门诊', triageLevel: '普通（常规复查，无紧急情况）', nurse: '李***（门诊分诊护士）', time: '2026-10-20 09:45:00' },
    { id: 'OT-005', patient: '吴***（男，60 岁，呼吸困难加重 1 天）', department: '呼吸内科门诊', triageLevel: '优先（呼吸困难加重，需优先就诊，排除呼吸衰竭）', nurse: '张***（门诊分诊护士）', time: '2026-10-20 10:15:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m338Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/outpatient/visits', handle: handleOutpatientVisits, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/prescriptions', handle: handleOutpatientPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/triage', handle: handleOutpatientTriage, auth: true },
];
