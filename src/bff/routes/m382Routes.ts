/**
 * 健澜科技 jlmedaios - M382 P1 业务扩展：医嘱处方深度打磨
 *
 * 医嘱详情/医嘱模板/处方列表/处方详情/处方审核（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/orders/detail - 医嘱详情 5 条 */
async function handleOrdersDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OD-001', orderId: 'ORD-2026-1001（张***的医嘱）', patientName: '张***（55 岁男性，高血压患者）', item: '硝苯地平缓释片（降压药）', dosage: '20mg/次，每日 2 次（口服）', doctor: '心内科主治医师李***' },
    { id: 'OD-002', orderId: 'ORD-2026-1002（李***的医嘱）', patientName: '李***（60 岁女性，糖尿病患者）', item: '二甲双胍缓释片（降糖药）', dosage: '0.5g/次，每日 2 次（口服，餐中服用）', doctor: '内分泌科副主任医师赵***' },
    { id: 'OD-003', orderId: 'ORD-2026-1003（王***的医嘱）', patientName: '王***（65 岁男性，冠心病患者）', item: '阿司匹林肠溶片（抗血小板药）', dosage: '100mg/次，每日 1 次（口服，早餐前服用）', doctor: '心内科主任医师孙***' },
    { id: 'OD-004', orderId: 'ORD-2026-1004（刘***的医嘱）', patientName: '刘***（70 岁女性，骨质疏松症患者）', item: '碳酸钙 D3 片（钙剂 + 维生素 D）', dosage: '1 片/次，每日 1 次（口服，餐后服用）', doctor: '骨科副主任医师周***' },
    { id: 'OD-005', orderId: 'ORD-2026-1005（陈***的医嘱）', patientName: '陈***（50 岁男性，慢性胃炎患者）', item: '奥美拉唑肠溶胶囊（抑酸药）', dosage: '20mg/次，每日 1 次（口服，早餐前服用）', doctor: '消化内科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/orders/templates - 医嘱模板 5 条 */
async function handleOrdersTemplates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OT-001', templateName: '高血压常规治疗医嘱模板', dept: '心内科', type: '长期医嘱模板', applicableDisease: '高血压病（1-3 级）', status: '已启用（当前有效）' },
    { id: 'OT-002', templateName: '糖尿病常规治疗医嘱模板', dept: '内分泌科', type: '长期医嘱模板', applicableDisease: '2 型糖尿病', status: '已启用（当前有效）' },
    { id: 'OT-003', templateName: '冠心病常规治疗医嘱模板', dept: '心内科', type: '长期医嘱模板', applicableDisease: '冠心病（稳定性心绞痛）', status: '已启用（当前有效）' },
    { id: 'OT-004', templateName: '术后常规治疗医嘱模板', dept: '外科系统', type: '临时医嘱模板', applicableDisease: '外科术后常规护理', status: '已启用（当前有效）' },
    { id: 'OT-005', templateName: '肺炎常规治疗医嘱模板', dept: '呼吸内科', type: '长期医嘱模板', applicableDisease: '社区获得性肺炎', status: '已启用（当前有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescriptions/list - 处方列表 5 条 */
async function handlePrescriptionsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PL-001', prescriptionId: 'RX-2026-1001', patientName: '张***（55 岁男性，高血压患者）', drugCount: '2 种药品', doctor: '心内科主治医师李***', time: '2026-10-20 09:00:00（开具时间）' },
    { id: 'PL-002', prescriptionId: 'RX-2026-1002', patientName: '李***（60 岁女性，糖尿病患者）', drugCount: '3 种药品', doctor: '内分泌科副主任医师赵***', time: '2026-10-20 10:00:00（开具时间）' },
    { id: 'PL-003', prescriptionId: 'RX-2026-1003', patientName: '王***（65 岁男性，冠心病患者）', drugCount: '4 种药品', doctor: '心内科主任医师孙***', time: '2026-10-20 11:00:00（开具时间）' },
    { id: 'PL-004', prescriptionId: 'RX-2026-1004', patientName: '刘***（70 岁女性，骨质疏松症患者）', drugCount: '2 种药品', doctor: '骨科副主任医师周***', time: '2026-10-20 14:00:00（开具时间）' },
    { id: 'PL-005', prescriptionId: 'RX-2026-1005', patientName: '陈***（50 岁男性，慢性胃炎患者）', drugCount: '3 种药品', doctor: '消化内科主治医师吴***', time: '2026-10-20 15:00:00（开具时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescriptions/detail - 处方详情 5 条 */
async function handlePrescriptionsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PD-001', prescriptionId: 'RX-2026-1001', patientName: '张***（55 岁男性，高血压患者）', drug: '硝苯地平缓释片', dosage: '20mg/次，每日 2 次', usage: '口服，早餐后及晚餐后各 1 次' },
    { id: 'PD-002', prescriptionId: 'RX-2026-1002', patientName: '李***（60 岁女性，糖尿病患者）', drug: '二甲双胍缓释片', dosage: '0.5g/次，每日 2 次', usage: '口服，餐中服用（早餐时及晚餐时各 1 次）' },
    { id: 'PD-003', prescriptionId: 'RX-2026-1003', patientName: '王***（65 岁男性，冠心病患者）', drug: '阿司匹林肠溶片', dosage: '100mg/次，每日 1 次', usage: '口服，早餐前 30 分钟服用' },
    { id: 'PD-004', prescriptionId: 'RX-2026-1004', patientName: '刘***（70 岁女性，骨质疏松症患者）', drug: '碳酸钙 D3 片', dosage: '1 片/次，每日 1 次', usage: '口服，餐后服用（午餐后 30 分钟）' },
    { id: 'PD-005', prescriptionId: 'RX-2026-1005', patientName: '陈***（50 岁男性，慢性胃炎患者）', drug: '奥美拉唑肠溶胶囊', dosage: '20mg/次，每日 1 次', usage: '口服，早餐前 30 分钟服用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescriptions/audit - 处方审核 5 条 */
async function handlePrescriptionsAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PA-001', prescriptionId: 'RX-2026-1001', auditor: '药师王***（主管药师）', result: '通过（处方合理，无用药禁忌）', issue: '无（处方内容完整、用法用量正确）', time: '2026-10-20 09:30:00（审核时间）' },
    { id: 'PA-002', prescriptionId: 'RX-2026-1002', auditor: '药师李***（主管药师）', result: '通过（处方合理，无用药禁忌）', issue: '无（处方内容完整、用法用量正确）', time: '2026-10-20 10:30:00（审核时间）' },
    { id: 'PA-003', prescriptionId: 'RX-2026-1003', auditor: '药师赵***（副主任药师）', result: '不通过（处方存在用药禁忌）', issue: '阿司匹林与华法林合用增加出血风险，建议调整用药方案', time: '2026-10-20 11:30:00（审核时间）' },
    { id: 'PA-004', prescriptionId: 'RX-2026-1004', auditor: '药师孙***（主管药师）', result: '通过（处方合理，无用药禁忌）', issue: '无（处方内容完整、用法用量正确）', time: '2026-10-20 14:30:00（审核时间）' },
    { id: 'PA-005', prescriptionId: 'RX-2026-1005', auditor: '药师周***（主管药师）', result: '通过（处方合理，无用药禁忌）', issue: '无（处方内容完整、用法用量正确）', time: '2026-10-20 15:30:00（审核时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m382Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/orders/detail', handle: handleOrdersDetail, auth: true },
  { method: 'GET', path: '/api/v1/orders/templates', handle: handleOrdersTemplates, auth: true },
  { method: 'GET', path: '/api/v1/prescriptions/list', handle: handlePrescriptionsList, auth: true },
  { method: 'GET', path: '/api/v1/prescriptions/detail', handle: handlePrescriptionsDetail, auth: true },
  { method: 'GET', path: '/api/v1/prescriptions/audit', handle: handlePrescriptionsAudit, auth: true },
];
