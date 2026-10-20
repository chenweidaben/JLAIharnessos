/**
 * 健澜科技 jlmedaios - M339 医嘱 + 处方域
 *
 * 医嘱列表/有效/已完成/已取消 + 门诊/住院/急诊处方（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/orders/list - 医嘱列表 5 条（补创建） */
async function handleOrdersList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OL-001', orderNo: 'ORD-2026-000001', patient: '张***（男，65 岁，心内科住院患者）', content: '阿司匹林肠溶片 100mg 口服 每日 1 次', status: '执行中（长期医嘱）', doctor: '李***（心内科主治医师）' },
    { id: 'OL-002', orderNo: 'ORD-2026-000002', patient: '王***（女，58 岁，普外科住院患者）', content: '头孢呋辛钠 1.5g 静脉滴注 每 12 小时 1 次', status: '执行中（临时医嘱）', doctor: '王***（普外科副主任医师）' },
    { id: 'OL-003', orderNo: 'ORD-2026-000003', patient: '刘***（男，72 岁，骨科住院患者）', content: '低分子肝素钠 4000IU 皮下注射 每日 1 次', status: '执行中（长期医嘱）', doctor: '赵***（骨科主任医师）' },
    { id: 'OL-004', orderNo: 'ORD-2026-000004', patient: '孙***（女，45 岁，普外科住院患者）', content: '甲状腺素片 50μg 口服 每日 1 次', status: '执行中（长期医嘱）', doctor: '周***（普外科副主任医师）' },
    { id: 'OL-005', orderNo: 'ORD-2026-000005', patient: '吴***（男，60 岁，胸外科住院患者）', content: '布地奈德雾化吸入 2mg 每日 2 次', status: '执行中（临时医嘱）', doctor: '郑***（胸外科主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/orders/active - 有效医嘱 5 条 */
async function handleOrdersActive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OA-001', orderNo: 'ORD-2026-000001', patient: '张***（男，65 岁，心内科住院患者）', content: '阿司匹林肠溶片 100mg 口服 每日 1 次', status: '执行中（长期医嘱，已执行 3 天）', doctor: '李***（心内科主治医师）' },
    { id: 'OA-002', orderNo: 'ORD-2026-000003', patient: '刘***（男，72 岁，骨科住院患者）', content: '低分子肝素钠 4000IU 皮下注射 每日 1 次', status: '执行中（长期医嘱，已执行 5 天）', doctor: '赵***（骨科主任医师）' },
    { id: 'OA-003', orderNo: 'ORD-2026-000004', patient: '孙***（女，45 岁，普外科住院患者）', content: '甲状腺素片 50μg 口服 每日 1 次', status: '执行中（长期医嘱，已执行 2 天）', doctor: '周***（普外科副主任医师）' },
    { id: 'OA-004', orderNo: 'ORD-2026-000006', patient: '张***（男，65 岁，心内科住院患者）', content: '阿托伐他汀钙片 20mg 口服 每晚 1 次', status: '执行中（长期医嘱，已执行 3 天）', doctor: '李***（心内科主治医师）' },
    { id: 'OA-005', orderNo: 'ORD-2026-000007', patient: '王***（女，58 岁，普外科住院患者）', content: '甲硝唑片 0.4g 口服 每日 3 次', status: '执行中（临时医嘱，已执行 1 天）', doctor: '王***（普外科副主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/orders/completed - 已完成医嘱 5 条 */
async function handleOrdersCompleted(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OC-001', orderNo: 'ORD-2026-000008', patient: '张***（男，65 岁，心内科住院患者）', content: '心电图检查（常规 12 导联）', completedTime: '2026-10-20 09:00:00', result: '完成（窦性心律，正常心电图）' },
    { id: 'OC-002', orderNo: 'ORD-2026-000009', patient: '王***（女，58 岁，普外科住院患者）', content: '血常规检查', completedTime: '2026-10-20 08:30:00', result: '完成（白细胞 6.5×10⁹/L，正常）' },
    { id: 'OC-003', orderNo: 'ORD-2026-000010', patient: '刘***（男，72 岁，骨科住院患者）', content: '髋关节 X 线正侧位', completedTime: '2026-10-20 10:00:00', result: '完成（假体位置良好，骨折愈合良好）' },
    { id: 'OC-004', orderNo: 'ORD-2026-000011', patient: '孙***（女，45 岁，普外科住院患者）', content: '甲状腺 B 超检查', completedTime: '2026-10-20 09:30:00', result: '完成（甲状腺右叶结节，TI-RADS 3 级）' },
    { id: 'OC-005', orderNo: 'ORD-2026-000012', patient: '吴***（男，60 岁，胸外科住院患者）', content: '胸部 CT 增强', completedTime: '2026-10-20 11:00:00', result: '完成（右肺下叶占位，考虑肺癌可能）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/orders/cancelled - 已取消医嘱 5 条 */
async function handleOrdersCancelled(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OCA-001', orderNo: 'ORD-2026-000013', patient: '张***（男，65 岁，心内科住院患者）', content: '硝酸甘油片 0.5mg 舌下含服（临时医嘱）', cancelReason: '患者血压已恢复正常（130/80mmHg），无需继续含服', canceller: '李***（心内科主治医师，2026-10-20 10:00:00）' },
    { id: 'OCA-002', orderNo: 'ORD-2026-000014', patient: '王***（女，58 岁，普外科住院患者）', content: '开塞露 20ml 肛注（临时医嘱）', cancelReason: '患者已自行排便，无需使用开塞露', canceller: '王***（普外科副主任医师，2026-10-20 09:30:00）' },
    { id: 'OCA-003', orderNo: 'ORD-2026-000015', patient: '刘***（男，72 岁，骨科住院患者）', content: '骨科会诊（临时医嘱）', cancelReason: '骨科手术已由本院骨科团队完成，无需外院会诊', canceller: '赵***（骨科主任医师，2026-10-20 11:00:00）' },
    { id: 'OCA-004', orderNo: 'ORD-2026-000016', patient: '孙***（女，45 岁，普外科住院患者）', content: '甲状腺功能复查（临时医嘱）', cancelReason: '患者甲状腺功能已正常，无需近期复查', canceller: '周***（普外科副主任医师，2026-10-20 10:30:00）' },
    { id: 'OCA-005', orderNo: 'ORD-2026-000017', patient: '吴***（男，60 岁，胸外科住院患者）', content: '胸腔穿刺（临时医嘱）', cancelReason: '患者胸腔积液已自行吸收，无需穿刺', canceller: '郑***（胸外科主任医师，2026-10-20 14:00:00）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescriptions/outpatient - 门诊处方 5 条 */
async function handlePrescriptionsOutpatient(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PO-001', prescriptionNo: 'RX-2026-OP-000001', patient: '张***（男，65 岁，高血压复诊）', drugs: '硝苯地平缓释片 20mg × 30 片（每日 1 次，每次 1 片）', amount: '15.00 元', status: '已审核（药房已调配）' },
    { id: 'PO-002', prescriptionNo: 'RX-2026-OP-000002', patient: '王***（女，58 岁，糖尿病复诊）', drugs: '二甲双胍缓释片 0.5g × 60 片（每日 2 次，每次 1 片）', amount: '20.00 元', status: '已审核（药房已调配）' },
    { id: 'PO-003', prescriptionNo: 'RX-2026-OP-000003', patient: '刘***（男，72 岁，脑卒中后康复）', drugs: '阿司匹林肠溶片 100mg × 30 片（每日 1 次，每次 1 片）', amount: '10.00 元', status: '已审核（药房已调配）' },
    { id: 'PO-004', prescriptionNo: 'RX-2026-OP-000004', patient: '孙***（女，45 岁，甲状腺结节随访）', drugs: '左甲状腺素钠片 50μg × 100 片（每日 1 次，每次 1 片）', amount: '30.00 元', status: '待审核' },
    { id: 'PO-005', prescriptionNo: 'RX-2026-OP-000005', patient: '吴***（男，60 岁，慢阻肺复诊）', drugs: '布地奈德福莫特罗吸入剂 160/4.5μg × 1 支（每日 2 次，每次 1 吸）', amount: '180.00 元', status: '已审核（药房已调配）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescriptions/inpatient - 住院处方 5 条 */
async function handlePrescriptionsInpatient(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PI-001', prescriptionNo: 'RX-2026-IP-000001', patient: '张***（男，65 岁，心内科住院患者）', drugs: '阿司匹林肠溶片 100mg', dosage: '100mg 口服', frequency: '每日 1 次（长期医嘱）' },
    { id: 'PI-002', prescriptionNo: 'RX-2026-IP-000002', patient: '王***（女，58 岁，普外科住院患者）', drugs: '头孢呋辛钠', dosage: '1.5g 静脉滴注', frequency: '每 12 小时 1 次（临时医嘱，术后 3 天）' },
    { id: 'PI-003', prescriptionNo: 'RX-2026-IP-000003', patient: '刘***（男，72 岁，骨科住院患者）', drugs: '低分子肝素钠', dosage: '4000IU 皮下注射', frequency: '每日 1 次（长期医嘱，术后 7 天）' },
    { id: 'PI-004', prescriptionNo: 'RX-2026-IP-000004', patient: '孙***（女，45 岁，普外科住院患者）', drugs: '左甲状腺素钠片', dosage: '50μg 口服', frequency: '每日 1 次（长期医嘱）' },
    { id: 'PI-005', prescriptionNo: 'RX-2026-IP-000005', patient: '吴***（男，60 岁，胸外科住院患者）', drugs: '布地奈德', dosage: '2mg 雾化吸入', frequency: '每日 2 次（临时医嘱，术后 5 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescriptions/emergency - 急诊处方 5 条 */
async function handlePrescriptionsEmergency(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PE-001', prescriptionNo: 'RX-2026-EM-000001', patient: '张***（男，65 岁，突发胸痛急诊）', drugs: '硝酸甘油片 0.5mg', dosage: '0.5mg 舌下含服', time: '2026-10-20 09:15:00（急诊就诊时间）' },
    { id: 'PE-002', prescriptionNo: 'RX-2026-EM-000002', patient: '王***（女，58 岁，突发呼吸困难急诊）', drugs: '呋塞米注射液 20mg', dosage: '20mg 静脉推注', time: '2026-10-20 10:30:00（急诊就诊时间）' },
    { id: 'PE-003', prescriptionNo: 'RX-2026-EM-000003', patient: '刘***（男，72 岁，意识不清急诊）', drugs: '葡萄糖注射液 50% 40ml', dosage: '40ml 静脉推注', time: '2026-10-20 11:00:00（急诊就诊时间）' },
    { id: 'PE-004', prescriptionNo: 'RX-2026-EM-000004', patient: '孙***（女，45 岁，突发腹痛急诊）', drugs: '山莨菪碱注射液 10mg', dosage: '10mg 肌肉注射', time: '2026-10-20 11:30:00（急诊就诊时间）' },
    { id: 'PE-005', prescriptionNo: 'RX-2026-EM-000005', patient: '吴***（男，60 岁，心跳呼吸骤停急诊）', drugs: '肾上腺素注射液 1mg', dosage: '1mg 静脉推注（每 3-5 分钟重复 1 次）', time: '2026-10-20 12:00:00（急诊抢救时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m339Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/orders/list', handle: handleOrdersList, auth: true },
  { method: 'GET', path: '/api/v1/orders/active', handle: handleOrdersActive, auth: true },
  { method: 'GET', path: '/api/v1/orders/completed', handle: handleOrdersCompleted, auth: true },
  { method: 'GET', path: '/api/v1/orders/cancelled', handle: handleOrdersCancelled, auth: true },
  { method: 'GET', path: '/api/v1/prescriptions/outpatient', handle: handlePrescriptionsOutpatient, auth: true },
  { method: 'GET', path: '/api/v1/prescriptions/inpatient', handle: handlePrescriptionsInpatient, auth: true },
  { method: 'GET', path: '/api/v1/prescriptions/emergency', handle: handlePrescriptionsEmergency, auth: true },
];
