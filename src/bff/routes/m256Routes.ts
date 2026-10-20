/**
 * 健澜科技 jlmedaios - M256 业务域继续扩展
 *
 * 设备维护/物资库存/病理报告/体检中心/科研项目/教学培训
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、设备/物资 ==================== */

/** GET /api/v1/equipment/maintenance - 设备维护记录 5 条 */
async function handleEquipmentMaintenance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'EM-001', name: 'CT 扫描仪', model: 'GE Revolution 256', maintainer: '设备科 王工', time: '2026-10-15 09:00', status: '正常' },
    { id: 'EM-002', name: 'MRI 扫描仪', model: 'Siemens Magnetom Skyra 3T', maintainer: '设备科 李工', time: '2026-10-18 14:00', status: '维护中' },
    { id: 'EM-003', name: '全自动生化分析仪', model: 'Beckman AU5800', maintainer: '检验科 赵工', time: '2026-10-10 10:00', status: '正常' },
    { id: 'EM-004', name: '监护仪', model: 'Philips IntelliVue MX800', maintainer: '设备科 王工', time: '2026-10-19 11:00', status: '正常' },
    { id: 'EM-005', name: '呼吸机', model: 'Drager Evita V800', maintainer: '设备科 李工', time: '2026-10-20 08:00', status: '故障（维修中）' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/supplies/inventory - 物资库存 5 条 */
async function handleSuppliesInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const items = [
    { id: 'SI-001', name: '一次性注射器（5ml）', category: '医用耗材', currentStock: 12500, warningThreshold: 3000, location: '耗材库 A-01' },
    { id: 'SI-002', name: '医用外科口罩', category: '防护用品', currentStock: 8500, warningThreshold: 2000, location: '防护库 B-03' },
    { id: 'SI-003', name: '75% 医用酒精（500ml）', category: '消毒用品', currentStock: 320, warningThreshold: 500, location: '消毒库 C-02' },
    { id: 'SI-004', name: '一次性输液器', category: '医用耗材', currentStock: 5600, warningThreshold: 1500, location: '耗材库 A-05' },
    { id: 'SI-005', name: 'N95 口罩', category: '防护用品', currentStock: 180, warningThreshold: 500, location: '防护库 B-01' },
  ];

  return json(ok({ items, totalCount: items.length, lowStockCount: 2 }));
}

/* ==================== 二、病理/体检 ==================== */

/** GET /api/v1/pathology/reports - 病理报告 5 条 */
async function handlePathologyReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'PR-001', patient: '张***', specimenType: '结肠活检组织', diagnosis: '（结肠）管状腺瘤，伴低级别上皮内瘤变', pathologist: '病理科 刘主任', time: '2026-10-18 16:00' },
    { id: 'PR-002', patient: '李***', specimenType: '甲状腺穿刺组织', diagnosis: '（甲状腺）乳头状癌', pathologist: '病理科 刘主任', time: '2026-10-19 10:00' },
    { id: 'PR-003', patient: '王***', specimenType: '胃镜活检组织', diagnosis: '（胃窦）慢性萎缩性胃炎，伴肠上皮化生', pathologist: '病理科 陈医生', time: '2026-10-19 14:00' },
    { id: 'PR-004', patient: '赵***', specimenType: '肺穿刺组织', diagnosis: '（肺）鳞状细胞癌', pathologist: '病理科 刘主任', time: '2026-10-20 09:00' },
    { id: 'PR-005', patient: '陈***', specimenType: '乳腺切除标本', diagnosis: '（乳腺）浸润性导管癌 II 级', pathologist: '病理科 陈医生', time: '2026-10-20 11:00' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/** GET /api/v1/physical/centers - 体检中心 5 条 */
async function handlePhysicalCenters(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const packages = [
    { id: 'PC-001', name: '基础体检套餐', examinedCount: 450, avgPrice: '¥380.00', completionRate: '98%', satisfaction: 4.5 },
    { id: 'PC-002', name: '中青年优选套餐', examinedCount: 320, avgPrice: '¥680.00', completionRate: '95%', satisfaction: 4.6 },
    { id: 'PC-003', name: '老年 comprehensive 套餐', examinedCount: 280, avgPrice: '¥1280.00', completionRate: '92%', satisfaction: 4.7 },
    { id: 'PC-004', name: '女性专项套餐', examinedCount: 195, avgPrice: '¥880.00', completionRate: '96%', satisfaction: 4.8 },
    { id: 'PC-005', name: '入职体检套餐', examinedCount: 520, avgPrice: '¥200.00', completionRate: '99%', satisfaction: 4.4 },
  ];

  return json(ok({ packages, totalCount: packages.length, totalExamined: 1765 }));
}

/* ==================== 三、科研/教学 ==================== */

/** GET /api/v1/research/projects - 科研项目 5 条 */
async function handleResearchProjects(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const projects = [
    { id: 'RP-001', name: 'AI 辅助冠心病影像诊断研究', pi: '李***（心内科）', funding: '¥500,000', status: '在研', period: '2025.01-2027.12' },
    { id: 'RP-002', name: '糖尿病并发症早期预警模型', pi: '赵***（内分泌）', funding: '¥300,000', status: '在研', period: '2025.06-2027.05' },
    { id: 'RP-003', name: '护理质量指标体系构建', pi: '刘***（护理部）', funding: '¥150,000', status: '结题', period: '2023.01-2025.12' },
    { id: 'RP-004', name: '互联网医院慢病管理模式探索', pi: '王***（信息科）', funding: '¥200,000', status: '在研', period: '2025.03-2026.12' },
    { id: 'RP-005', name: '中药干预肺炎临床研究', pi: '陈***（中医科）', funding: '¥100,000', status: '中止', period: '2024.01-2025.06' },
  ];

  return json(ok({ projects, totalCount: projects.length, totalFunding: '¥1,250,000' }));
}

/** GET /api/v1/education/trainings - 教学培训 5 条 */
async function handleEducationTrainings(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const trainings = [
    { id: 'ET-001', name: '心肺复苏（CPR）培训', instructor: '急诊科 王主任', attendees: 120, hours: 4, passRate: '98%' },
    { id: 'ET-002', name: '电子病历五级评审规范解读', instructor: '医务处 李主任', attendees: 85, hours: 3, passRate: '95%' },
    { id: 'ET-003', name: '医院感染控制培训', instructor: '感控科 陈主任', attendees: 200, hours: 2, passRate: '99%' },
    { id: 'ET-004', name: 'CDSS 临床使用培训', instructor: '信息科 王工程师', attendees: 60, hours: 2, passRate: '92%' },
    { id: 'ET-005', name: '医疗纠纷预防与处理', instructor: '法务部 赵律师', attendees: 150, hours: 3, passRate: '96%' },
  ];

  return json(ok({ trainings, totalCount: trainings.length, totalAttendees: 615 }));
}

export const m256Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/maintenance', handle: handleEquipmentMaintenance, auth: true },
  { method: 'GET', path: '/api/v1/supplies/inventory', handle: handleSuppliesInventory, auth: true },
  { method: 'GET', path: '/api/v1/pathology/reports', handle: handlePathologyReports, auth: true },
  { method: 'GET', path: '/api/v1/physical/centers', handle: handlePhysicalCenters, auth: true },
  { method: 'GET', path: '/api/v1/research/projects', handle: handleResearchProjects, auth: true },
  { method: 'GET', path: '/api/v1/education/trainings', handle: handleEducationTrainings, auth: true },
];
