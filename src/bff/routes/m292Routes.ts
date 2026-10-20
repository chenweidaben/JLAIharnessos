/**
 * 健澜科技 jlmedaios - M292 业务域补充
 *
 * 采购管理/资产管理/预防保健/出院小结
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/financial/procurement - 采购管理 5 条 */
async function handleFinancialProcurement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PR-001', project: 'CT 球管更换', amount: '1,200,000 元', supplier: '西门子医疗', status: '已签订合同', date: '2026-10-15' },
    { id: 'PR-002', project: '一次性注射器（年度集采）', amount: '85,000 元', supplier: '江苏鱼跃医疗', status: '已到货验收', date: '2026-10-10' },
    { id: 'PR-003', project: '核磁共振维保合同', amount: '350,000 元/年', supplier: 'GE 医疗', status: '审批中', date: '2026-10-20' },
    { id: 'PR-004', project: '医院信息系统升级', amount: '2,800,000 元', supplier: '健澜科技', status: '已立项', date: '2026-09-28' },
    { id: 'PR-005', project: '办公电脑采购（50台）', amount: '250,000 元', supplier: '联想集团', status: '已到货验收', date: '2026-10-05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/financial/assets - 资产管理 5 条 */
async function handleFinancialAssets(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const assets = [
    { id: 'AS-001', name: 'CT 扫描仪（64排）', category: '大型医疗设备', originalValue: '12,000,000 元', status: '在用', dept: '放射科' },
    { id: 'AS-002', name: '核磁共振（1.5T）', category: '大型医疗设备', originalValue: '8,500,000 元', status: '在用', dept: '放射科' },
    { id: 'AS-003', name: '监护仪（多参数）', category: '常规医疗设备', originalValue: '35,000 元/台', status: '在用', dept: 'ICU' },
    { id: 'AS-004', name: '全自动生化分析仪', category: '检验设备', originalValue: '450,000 元', status: '在用', dept: '检验科' },
    { id: 'AS-005', name: '手术灯（LED 无影灯）', category: '手术设备', originalValue: '120,000 元', status: '待报废', dept: '手术室' },
  ];
  return json(ok({ assets, totalCount: assets.length }));
}

/** GET /api/v1/logistics/preventive - 预防保健 5 条 */
async function handleLogisticsPreventive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PV-001', project: '员工年度体检', target: '全院在职职工（约 1200 人）', count: '1180 人次', time: '2026-09~10 月', manager: '人力资源部' },
    { id: 'PV-002', project: '儿童预防接种（社区）', target: '0-6 岁儿童（约 3500 人）', count: '每月约 800 剂次', time: '每月定期', manager: '预防保健科' },
    { id: 'PV-003', project: '老年健康体检（65岁以上）', target: '辖区老年人（约 5000 人）', count: '已完成 3200 人', time: '2026-04~10 月', manager: '社区卫生服务中心' },
    { id: 'PV-004', project: '重点人群高血压随访', target: '高血压患者（约 2800 人）', count: '每月随访 1500 人次', time: '每月定期', manager: '慢病管理科' },
    { id: 'PV-005', project: '职业暴露预防（医护人员）', target: '临床一线医护（约 800 人）', count: '已完成 780 人', time: '2026-08~9 月', manager: '院感科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/discharge/summary - 出院小结 5 条 */
async function handleDischargeSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const summaries = [
    { id: 'DS-001', patient: '王***', dept: '呼吸内科', dischargeDate: '2026-10-18', diagnosis: '社区获得性肺炎（细菌性）', doctor: '李***主治医师' },
    { id: 'DS-002', patient: '李***', dept: '普外科', dischargeDate: '2026-10-17', diagnosis: '急性阑尾炎（已行腹腔镜阑尾切除术）', doctor: '陈***副主任医师' },
    { id: 'DS-003', patient: '张***', dept: '心血管内科', dischargeDate: '2026-10-16', diagnosis: '冠心病、不稳定型心绞痛', doctor: '刘***主任' },
    { id: 'DS-004', patient: '赵***', dept: '骨科', dischargeDate: '2026-10-15', diagnosis: '右股骨颈骨折（已行人工髋关节置换术）', doctor: '王***副主任医师' },
    { id: 'DS-005', patient: '孙***', dept: '消化内科', dischargeDate: '2026-10-14', diagnosis: '胃溃疡（A1期）', doctor: '周***主治医师' },
  ];
  return json(ok({ summaries, totalCount: summaries.length }));
}

export const m292Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/financial/procurement', handle: handleFinancialProcurement, auth: true },
  { method: 'GET', path: '/api/v1/financial/assets', handle: handleFinancialAssets, auth: true },
  { method: 'GET', path: '/api/v1/logistics/preventive', handle: handleLogisticsPreventive, auth: true },
  { method: 'GET', path: '/api/v1/discharge/summary', handle: handleDischargeSummary, auth: true },
];
