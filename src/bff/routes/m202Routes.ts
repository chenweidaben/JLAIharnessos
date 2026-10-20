/**
 * 健澜科技 jlmedaios - M202 设备物资 + 教学 + 安全审计管理域
 *
 * 设备台账/维修/检定 + 耗材库存/使用 + 培训/科研 + 登录/操作审计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 设备管理 ==================== */

/** GET /api/v1/equipment/assets - 大型设备台账 */
async function handleEquipmentAssets(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const assets = [
    { name: 'CT扫描仪', model: 'Siemens SOMATOM', code: 'EQ-CT-001', dept: '影像科', purchaseDate: '2023-06-15', value: 850, status: '在用' },
    { name: 'MRI扫描仪', model: 'GE 1.5T', code: 'EQ-MR-001', dept: '影像科', purchaseDate: '2022-03-20', value: 1200, status: '在用' },
    { name: 'DR摄影机', model: 'Philips DigitalDiagnost', code: 'EQ-DR-001', dept: '放射科', purchaseDate: '2024-01-10', value: 320, status: '在用' },
    { name: '彩色超声仪', model: 'Philips EPIQ 7', code: 'EQ-US-001', dept: '超声科', purchaseDate: '2023-09-05', value: 450, status: '维修' },
    { name: '生化分析仪', model: 'Roche Cobas 8000', code: 'EQ-CH-001', dept: '检验科', purchaseDate: '2022-11-30', value: 280, status: '闲置' },
  ];

  return json(ok({ assets, totalCount: assets.length }));
}

/** GET /api/v1/equipment/maintenance - 设备维修记录 */
async function handleEquipmentMaintenance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { equipment: '彩色超声仪', fault: '探头图像模糊', technician: '工程师-赵工', cost: 12000, status: '维修中' },
    { equipment: 'CT扫描仪', fault: '球管温度过高', technician: '工程师-钱工', cost: 45000, status: '已修复' },
    { equipment: 'DR摄影机', fault: '探测器校准失败', technician: '工程师-孙工', cost: 8000, status: '待配件' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/equipment/calibration - 计量检定记录 */
async function handleEquipmentCalibration(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { equipment: 'CT扫描仪', date: '2026-01-15', validUntil: '2027-01-14', result: '合格' },
    { equipment: 'MRI扫描仪', date: '2026-03-20', validUntil: '2027-03-19', result: '合格' },
    { equipment: '生化分析仪', date: '2026-06-10', validUntil: '2026-12-09', result: '限用' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/* ==================== 物资耗材 ==================== */

/** GET /api/v1/supplies/inventory - 高值耗材库存 */
async function handleSuppliesInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const supplies = [
    { name: '药物洗脱心脏支架', spec: '3.0x18mm', batch: 'S20260901', expiry: '2028-09-01', stock: 50, price: 12000 },
    { name: '人工髋关节假体', spec: '陶瓷对陶瓷', batch: 'J20260815', expiry: '2029-08-15', stock: 20, price: 35000 },
    { name: '骨科钢板（锁定）', spec: '4.5mm x 10孔', batch: 'G20260720', expiry: '2028-07-20', stock: 80, price: 4500 },
    { name: '血液透析器', spec: '高通量 F18', batch: 'D20261001', expiry: '2027-10-01', stock: 200, price: 280 },
    { name: '输液泵（一次性）', spec: '50ml', batch: 'Y20260910', expiry: '2027-09-10', stock: 500, price: 150 },
  ];

  return json(ok({ supplies, totalCount: supplies.length }));
}

/** GET /api/v1/supplies/usage - 耗材使用统计 */
async function handleSuppliesUsage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayOutbound: 86500.00,
    deptTop3: [
      { dept: '心内科', amount: 36000.00 },
      { dept: '骨科', amount: 28000.00 },
      { dept: '肾内科', amount: 12500.00 },
    ],
    trace: [
      { id: 'TRACE-001', patient: '张演示', supply: '心脏支架', batch: 'S20260901', usage: 'PCI手术', date: '2026-10-20' },
      { id: 'TRACE-002', patient: '李患者', supply: '人工髋关节', batch: 'J20260815', usage: '髋关节置换', date: '2026-10-19' },
      { id: 'TRACE-003', patient: '王患者', supply: '透析器', batch: 'D20261001', usage: '血液透析', date: '2026-10-20' },
    ],
  }));
}

/* ==================== 教学科研 ==================== */

/** GET /api/v1/education/trainings - 培训计划 */
async function handleEducationTrainings(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const trainings = [
    { name: '心肺复苏（CPR）培训', dept: '全院', lecturer: '急诊科-王主任', time: '2026-10-25 14:00', attendees: 50, passRate: '96%' },
    { name: '院感防控知识更新', dept: '护理部', lecturer: '院感科-李科长', time: '2026-10-22 09:00', attendees: 80, passRate: '92%' },
    { name: '病历书写规范', dept: '医务部', lecturer: '质控科-张主任', time: '2026-10-28 15:00', attendees: 120, passRate: '88%' },
    { name: '医患沟通技巧', dept: '门诊办', lecturer: '心理科-陈医生', time: '2026-11-01 10:00', attendees: 60, passRate: '95%' },
    { name: 'CT设备操作培训', dept: '影像科', lecturer: '设备科-赵工', time: '2026-10-30 09:30', attendees: 20, passRate: '100%' },
  ];

  return json(ok({ trainings, totalCount: trainings.length }));
}

/** GET /api/v1/research/projects - 在研项目 */
async function handleResearchProjects(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const projects = [
    { name: 'AI辅助冠心病影像诊断研究', pi: '李主任', funding: 50, start: '2025-06-01', status: '在研' },
    { name: '糖尿病肾病早期标志物筛选', pi: '王医生', funding: 30, start: '2025-09-01', status: '中期' },
    { name: '院感防控智能预警系统', pi: '张科长', funding: 80, start: '2024-03-01', status: '结题' },
    { name: '肿瘤免疫治疗真实世界研究', pi: '刘主任', funding: 120, start: '2025-01-01', status: '在研' },
    { name: '中医中药治疗慢阻肺疗效评价', pi: '陈医生', funding: 25, start: '2025-11-01', status: '在研' },
  ];

  return json(ok({ projects, totalCount: projects.length }));
}

/* ==================== 安全审计 ==================== */

/** GET /api/v1/security/login-logs - 登录日志 */
async function handleSecurityLoginLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { username: 'doctor_li', ip: '192.168.1.100', time: '2026-10-20 08:30:15', device: 'PC', result: '成功' },
    { username: 'nurse_wang', ip: '192.168.1.105', time: '2026-10-20 08:35:22', device: 'PC', result: '成功' },
    { username: 'patient_test', ip: '112.10.20.30', time: '2026-10-20 09:00:45', device: '手机', result: '成功' },
    { username: 'admin', ip: '192.168.1.1', time: '2026-10-20 09:15:33', device: 'PC', result: '成功' },
    { username: 'unknown_user', ip: '203.0.113.50', time: '2026-10-20 09:20:10', device: 'PC', result: '失败' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

/** GET /api/v1/security/operation-logs - 操作审计 */
async function handleSecurityOperationLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { username: 'doctor_li', action: '查询', module: '患者', time: '2026-10-20 08:45:12', ip: '192.168.1.100', result: '成功' },
    { username: 'doctor_li', action: '修改', module: '医嘱', time: '2026-10-20 09:00:33', ip: '192.168.1.100', result: '成功' },
    { username: 'nurse_wang', action: '查询', module: '患者', time: '2026-10-20 09:10:22', ip: '192.168.1.105', result: '成功' },
    { username: 'admin', action: '导出', module: '收费', time: '2026-10-20 10:00:45', ip: '192.168.1.1', result: '成功' },
    { username: 'unknown_user', action: '删除', module: '患者', time: '2026-10-20 10:15:10', ip: '203.0.113.50', result: '失败' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

export const m202Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/assets', handle: handleEquipmentAssets, auth: true },
  { method: 'GET', path: '/api/v1/equipment/maintenance', handle: handleEquipmentMaintenance, auth: true },
  { method: 'GET', path: '/api/v1/equipment/calibration', handle: handleEquipmentCalibration, auth: true },
  { method: 'GET', path: '/api/v1/supplies/inventory', handle: handleSuppliesInventory, auth: true },
  { method: 'GET', path: '/api/v1/supplies/usage', handle: handleSuppliesUsage, auth: true },
  { method: 'GET', path: '/api/v1/education/trainings', handle: handleEducationTrainings, auth: true },
  { method: 'GET', path: '/api/v1/research/projects', handle: handleResearchProjects, auth: true },
  { method: 'GET', path: '/api/v1/security/login-logs', handle: handleSecurityLoginLogs, auth: true },
  { method: 'GET', path: '/api/v1/security/operation-logs', handle: handleSecurityOperationLogs, auth: true },
];
