/**
 * 健澜科技 jlmedaios - M272 业务域扩展
 *
 * 收费列表/成本核算/库存预警/设备故障/护理交班/患者满意度
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/billing/list - 收费列表 8 条 */
async function handleBillingList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const bills = [
    { id: 'BL-001', billNo: 'BILL-20261020-001', patient: '张***', item: '门诊诊查费', amount: '¥25.00', time: '2026-10-20 08:30', status: '已支付' },
    { id: 'BL-002', billNo: 'BILL-20261020-002', patient: '李***', item: '血常规检查', amount: '¥35.00', time: '2026-10-20 09:00', status: '已支付' },
    { id: 'BL-003', billNo: 'BILL-20261020-003', patient: '王***', item: '胸部 CT 平扫', amount: '¥280.00', time: '2026-10-20 09:15', status: '已支付' },
    { id: 'BL-004', billNo: 'BILL-20261020-004', patient: '赵***', item: '住院押金', amount: '¥5,000.00', time: '2026-10-20 10:00', status: '已支付' },
    { id: 'BL-005', billNo: 'BILL-20261020-005', patient: '陈***', item: '药品费（阿司匹林）', amount: '¥45.00', time: '2026-10-20 10:30', status: '待支付' },
    { id: 'BL-006', billNo: 'BILL-20261020-006', patient: '孙***', item: '手术费（阑尾切除）', amount: '¥3,500.00', time: '2026-10-20 11:00', status: '已支付' },
    { id: 'BL-007', billNo: 'BILL-20261020-007', patient: '周***', item: '治疗费（雾化吸入）', amount: '¥30.00', time: '2026-10-20 11:20', status: '已支付' },
    { id: 'BL-008', billNo: 'BILL-20261020-008', patient: '吴***', item: '护理费（一级护理）', amount: '¥80.00', time: '2026-10-20 14:00', status: '已支付' },
  ];
  return json(ok({ bills, totalCount: bills.length }));
}

/** GET /api/v1/finance/cost - 成本核算 5 条 */
async function handleFinanceCost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const costs = [
    { id: 'FC-001', dept: '心内科', laborCost: '¥1,250,000', materialCost: '¥680,000', equipmentCost: '¥320,000', totalCost: '¥2,250,000' },
    { id: 'FC-002', dept: '骨科', laborCost: '¥980,000', materialCost: '¥1,200,000', equipmentCost: '¥450,000', totalCost: '¥2,630,000' },
    { id: 'FC-003', dept: '检验科', laborCost: '¥560,000', materialCost: '¥890,000', equipmentCost: '¥780,000', totalCost: '¥2,230,000' },
    { id: 'FC-004', dept: '放射科', laborCost: '¥420,000', materialCost: '¥350,000', equipmentCost: '¥1,500,000', totalCost: '¥2,270,000' },
    { id: 'FC-005', dept: '内科综合', laborCost: '¥1,100,000', materialCost: '¥520,000', equipmentCost: '¥280,000', totalCost: '¥1,900,000' },
  ];
  return json(ok({ costs, totalCount: costs.length }));
}

/** GET /api/v1/inventory/warning - 库存预警 5 条 */
async function handleInventoryWarning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const warnings = [
    { id: 'IW-001', item: '一次性注射器 5ml', stock: 200, safetyStock: 500, status: '低于安全库存', suggestion: '请尽快采购 3000 支' },
    { id: 'IW-002', item: '医用纱布块', stock: 800, safetyStock: 1000, status: '低于安全库存', suggestion: '请补货 2000 块' },
    { id: 'IW-003', item: '75% 酒精', stock: 25, safetyStock: 50, status: '严重不足', suggestion: '紧急采购 100 瓶' },
    { id: 'IW-004', item: '头孢呋辛酯片', stock: 500, safetyStock: 300, status: '正常', suggestion: '无需操作' },
    { id: 'IW-005', item: '输液器', stock: 150, safetyStock: 400, status: '低于安全库存', suggestion: '请补货 2000 套' },
  ];
  return json(ok({ warnings, totalCount: warnings.length }));
}

/** GET /api/v1/equipment/fault - 设备故障 5 条 */
async function handleEquipmentFault(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const faults = [
    { id: 'EF-001', equipment: 'CT 扫描仪（GE 64排）', fault: '球管温度异常升高', reporter: '放射科 刘工程师', time: '2026-10-20 08:00', status: '维修中' },
    { id: 'EF-002', equipment: '全自动生化分析仪', fault: '加样针堵塞', reporter: '检验科 王技师', time: '2026-10-19 14:00', status: '已修复' },
    { id: 'EF-003', equipment: '心电监护仪（ICU-03）', fault: '血氧模块无信号', reporter: 'ICU 陈护士', time: '2026-10-20 10:30', status: '待维修' },
    { id: 'EF-004', equipment: '麻醉机（OR-02）', fault: '风箱漏气', reporter: '手术室 周护士长', time: '2026-10-18 09:00', status: '已修复' },
    { id: 'EF-005', equipment: '超声诊断仪', fault: '探头接触面磨损', reporter: '超声科 李医生', time: '2026-10-20 11:00', status: '待维修' },
  ];
  return json(ok({ faults, totalCount: faults.length }));
}

/** GET /api/v1/nursing/shift - 护理交班 5 条 */
async function handleNursingShift(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const shifts = [
    { id: 'NS-001', shift: '白班 08:00-16:00', dept: '心内科一病区', handover: '陈护士', takover: '刘护士', content: '3 床患者术后第 2 天，引流管通畅；12 床患者今早血压偏高已加药' },
    { id: 'NS-002', shift: '小夜 16:00-24:00', dept: '心内科一病区', handover: '刘护士', takover: '王护士', content: '注意观察 8 床患者心率变化；夜班需测 3 次血糖' },
    { id: 'NS-003', shift: '大夜 24:00-08:00', dept: '骨科病区', handover: '赵护士', takover: '孙护士', content: '5 床患者术后疼痛评分 6 分，已用止痛药；注意观察引流液量' },
    { id: 'NS-004', shift: '白班 08:00-16:00', dept: 'ICU', handover: '周护士长', takover: '吴护士', content: '2 床患者呼吸机参数已调整，今日脱机试验；注意记录出入量' },
    { id: 'NS-005', shift: '小夜 16:00-24:00', dept: '儿科', handover: '郑护士', takover: '钱护士', content: '15 床患儿体温 38.5℃，已物理降温；注意观察皮疹' },
  ];
  return json(ok({ shifts, totalCount: shifts.length }));
}

/** GET /api/v1/patient/satisfaction - 患者满意度 5 条 */
async function handlePatientSatisfaction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const feedback = [
    { id: 'PS-001', patient: '张***', dept: '心内科', score: 5, comment: '李主任医术高明，护士态度也好', time: '2026-10-20 10:00' },
    { id: 'PS-002', patient: '李***', dept: '骨科', score: 4, comment: '住院环境不错，就是等床时间长了点', time: '2026-10-19 15:00' },
    { id: 'PS-003', patient: '王***', dept: '检验科', score: 5, comment: '抽血护士技术很好，一点都不疼', time: '2026-10-20 09:30' },
    { id: 'PS-004', patient: '赵***', dept: '放射科', score: 3, comment: 'CT 排队时间太长了，等了 1 个多小时', time: '2026-10-18 14:00' },
    { id: 'PS-005', patient: '陈***', dept: '内分泌科', score: 5, comment: '医生讲解很详细，用药指导很清楚', time: '2026-10-20 11:00' },
  ];
  return json(ok({ feedback, totalCount: feedback.length, avgScore: 4.4 }));
}

export const m272Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/billing/list', handle: handleBillingList, auth: true },
  { method: 'GET', path: '/api/v1/finance/cost', handle: handleFinanceCost, auth: true },
  { method: 'GET', path: '/api/v1/inventory/warning', handle: handleInventoryWarning, auth: true },
  { method: 'GET', path: '/api/v1/equipment/fault', handle: handleEquipmentFault, auth: true },
  { method: 'GET', path: '/api/v1/nursing/shift', handle: handleNursingShift, auth: true },
  { method: 'GET', path: '/api/v1/patient/satisfaction', handle: handlePatientSatisfaction, auth: true },
];
