/**
 * 健澜科技 jlmedaios - M212 消毒供应 + ICU + 血库 + 静配中心
 *
 * CSSD申领/灭菌/库存 + ICU患者/监护 + 血库库存/用血 + PIVAS医嘱
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、消毒供应中心 CSSD ==================== */

/** GET /api/v1/cssd/requests - 器械包申领 */
async function handleCssdRequests(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const requests = [
    { id: 'CSSD-REQ-001', dept: '普外科', packName: '手术包（常规）', quantity: 5, needTime: '2026-10-20 14:00', status: '已发放' },
    { id: 'CSSD-REQ-002', dept: '换药室', packName: '换药包', quantity: 20, needTime: '2026-10-20 09:00', status: '已签收' },
    { id: 'CSSD-REQ-003', dept: '口腔科', packName: '口腔包', quantity: 8, needTime: '2026-10-20 10:00', status: '已发放' },
    { id: 'CSSD-REQ-004', dept: '妇产科', packName: '妇产科包', quantity: 3, needTime: '2026-10-20 15:00', status: '待发放' },
    { id: 'CSSD-REQ-005', dept: '急诊科', packName: '抢救包', quantity: 2, needTime: '2026-10-20 08:30', status: '已签收' },
  ];

  return json(ok({ requests, totalCount: requests.length }));
}

/** GET /api/v1/cssd/sterilization - 灭菌记录 */
async function handleCssdSterilization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'CSSD-STER-001', packName: '手术包（常规）', method: '压力蒸汽', batchNo: 'ST-20261020-001', sterilizeDate: '2026-10-20 08:00', result: '合格', validUntil: '2026-10-27' },
    { id: 'CSSD-STER-002', packName: '换药包', method: '压力蒸汽', batchNo: 'ST-20261020-002', sterilizeDate: '2026-10-20 08:30', result: '合格', validUntil: '2026-10-27' },
    { id: 'CSSD-STER-003', packName: '腹腔镜器械包', method: '低温等离子', batchNo: 'ST-20261020-003', sterilizeDate: '2026-10-20 09:00', result: '合格', validUntil: '2026-10-24' },
    { id: 'CSSD-STER-004', packName: '眼科器械包', method: '环氧乙烷', batchNo: 'ST-20261019-004', sterilizeDate: '2026-10-19 14:00', result: '合格', validUntil: '2026-11-02' },
    { id: 'CSSD-STER-005', packName: '手术室专用包', method: '压力蒸汽', batchNo: 'ST-20261020-005', sterilizeDate: '2026-10-20 09:30', result: '不合格', validUntil: null },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/cssd/inventory - 库存盘点 */
async function handleCssdInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const inventory = [
    { id: 'CSSD-INV-001', packName: '手术包（常规）', currentStock: 50, minThreshold: 30, location: 'A区-货架1', status: '充足' },
    { id: 'CSSD-INV-002', packName: '换药包', currentStock: 15, minThreshold: 20, location: 'A区-货架2', status: '偏低' },
    { id: 'CSSD-INV-003', packName: '口腔包', currentStock: 8, minThreshold: 10, location: 'B区-货架1', status: '偏低' },
    { id: 'CSSD-INV-004', packName: '妇产科包', currentStock: 5, minThreshold: 5, location: 'B区-货架2', status: '充足' },
    { id: 'CSSD-INV-005', packName: '腹腔镜器械包', currentStock: 2, minThreshold: 4, location: 'C区-专用柜', status: '紧缺' },
  ];

  return json(ok({ inventory, totalCount: inventory.length }));
}

/* ==================== 二、ICU 重症监护 ==================== */

/** GET /api/v1/icu/patients - ICU 在床患者 */
async function handleIcuPatients(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patients = [
    { id: 'ICU-PAT-001', bedNo: 'ICU-01', patient: '赵患者', diagnosis: '重症肺炎合并呼吸衰竭', apache2: 22, rass: -2, admitTime: '2026-10-18 10:00' },
    { id: 'ICU-PAT-002', bedNo: 'ICU-02', patient: '钱患者', diagnosis: '急性心肌梗死术后', apache2: 18, rass: -1, admitTime: '2026-10-19 08:00' },
    { id: 'ICU-PAT-003', bedNo: 'ICU-03', patient: '孙患者', diagnosis: '感染性休克', apache2: 28, rass: -3, admitTime: '2026-10-19 14:00' },
    { id: 'ICU-PAT-004', bedNo: 'ICU-04', patient: '周患者', diagnosis: '多发伤术后', apache2: 20, rass: -2, admitTime: '2026-10-20 06:00' },
    { id: 'ICU-PAT-005', bedNo: 'ICU-05', patient: '吴患者', diagnosis: '急性肾功能衰竭', apache2: 25, rass: -1, admitTime: '2026-10-20 09:00' },
  ];

  return json(ok({ patients, totalCount: patients.length }));
}

/** GET /api/v1/icu/monitoring - 监护数据 */
async function handleIcuMonitoring(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const monitoring = [
    { id: 'ICU-MON-001', patient: '赵患者', heartRate: 95, sbp: 110, dbp: 65, spo2: 92, respRate: 22, temperature: 38.5, recordTime: '2026-10-20 10:00' },
    { id: 'ICU-MON-002', patient: '钱患者', heartRate: 82, sbp: 125, dbp: 75, spo2: 98, respRate: 18, temperature: 37.2, recordTime: '2026-10-20 10:00' },
    { id: 'ICU-MON-003', patient: '孙患者', heartRate: 110, sbp: 85, dbp: 50, spo2: 88, respRate: 28, temperature: 39.2, recordTime: '2026-10-20 10:00' },
  ];

  return json(ok({ monitoring, totalCount: monitoring.length }));
}

/* ==================== 三、血库管理 ==================== */

/** GET /api/v1/blood/inventory - 血液库存 */
async function handleBloodInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const inventory = [
    { id: 'BLD-INV-001', bloodType: 'A型 Rh阳性', component: '悬浮红细胞', volume: 20, receiveDate: '2026-10-15', validUntil: '2026-10-22', status: '充足' },
    { id: 'BLD-INV-002', bloodType: 'B型 Rh阳性', component: '悬浮红细胞', volume: 15, receiveDate: '2026-10-16', validUntil: '2026-10-23', status: '充足' },
    { id: 'BLD-INV-003', bloodType: 'O型 Rh阳性', component: '新鲜冰冻血浆', volume: 30, receiveDate: '2026-10-14', validUntil: '2026-11-14', status: '充足' },
    { id: 'BLD-INV-004', bloodType: 'AB型 Rh阳性', component: '血小板', volume: 5, receiveDate: '2026-10-19', validUntil: '2026-10-22', status: '偏低' },
    { id: 'BLD-INV-005', bloodType: 'O型 Rh阴性', component: '悬浮红细胞', volume: 2, receiveDate: '2026-10-10', validUntil: '2026-10-17', status: '紧缺' },
  ];

  return json(ok({ inventory, totalCount: inventory.length }));
}

/** GET /api/v1/blood/usage - 用血记录 */
async function handleBloodUsage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const usage = [
    { id: 'BLD-USE-001', patient: '张演示', bloodType: 'A型 Rh阳性', volume: 400, purpose: '手术（PCI术中）', transfusionTime: '2026-10-16 15:30', status: '已输血' },
    { id: 'BLD-USE-002', patient: '李患者', bloodType: 'B型 Rh阳性', volume: 200, purpose: '贫血（消化道出血）', transfusionTime: '2026-10-20 09:00', status: '输血中' },
    { id: 'BLD-USE-003', patient: '王患者', bloodType: 'O型 Rh阳性', volume: 600, purpose: '急救（失血性休克）', transfusionTime: '2026-10-20 11:00', status: '待输血' },
  ];

  return json(ok({ usage, totalCount: usage.length }));
}

/* ==================== 四、静配中心 PIVAS ==================== */

/** GET /api/v1/pivas/orders - 静配医嘱 */
async function handlePivasOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const orders = [
    { id: 'PIVAS-001', patient: '张演示', drugName: '注射用头孢曲松钠', solvent: '0.9%生理盐水', dose: '2g', batch: '今日第1批', status: '已配制' },
    { id: 'PIVAS-002', patient: '李患者', drugName: '左氧氟沙星注射液', solvent: '5%葡萄糖', dose: '0.5g', batch: '今日第1批', status: '已送出' },
    { id: 'PIVAS-003', patient: '王患者', drugName: '参麦注射液', solvent: '灭菌注射用水', dose: '40ml', batch: '今日第2批', status: '配制中' },
    { id: 'PIVAS-004', patient: '赵患者', drugName: '奥美拉唑钠注射液', solvent: '0.9%生理盐水', dose: '40mg', batch: '今日第2批', status: '待配' },
    { id: 'PIVAS-005', patient: '刘患者', drugName: '10%氯化钾注射液', solvent: '5%葡萄糖', dose: '10ml', batch: '今日第3批', status: '待配' },
  ];

  return json(ok({ orders, totalCount: orders.length }));
}

export const m212Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cssd/requests', handle: handleCssdRequests, auth: true },
  { method: 'GET', path: '/api/v1/cssd/sterilization', handle: handleCssdSterilization, auth: true },
  { method: 'GET', path: '/api/v1/cssd/inventory', handle: handleCssdInventory, auth: true },
  { method: 'GET', path: '/api/v1/icu/patients', handle: handleIcuPatients, auth: true },
  { method: 'GET', path: '/api/v1/icu/monitoring', handle: handleIcuMonitoring, auth: true },
  { method: 'GET', path: '/api/v1/blood/inventory', handle: handleBloodInventory, auth: true },
  { method: 'GET', path: '/api/v1/blood/usage', handle: handleBloodUsage, auth: true },
  { method: 'GET', path: '/api/v1/pivas/orders', handle: handlePivasOrders, auth: true },
];
