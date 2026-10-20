/**
 * 健澜科技 jlmedaios - M334 药品物资 + 人力资源域
 *
 * 药品采购/药品发药 + 员工培训（复数路径）/招聘管理（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/purchasing - 药品采购 5 条 */
async function handlePharmacyPurchasing(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PP-001', drugName: '阿莫西林胶囊（抗生素）', quantity: '100 盒（24 粒/盒）', unitPrice: '8.50 元/盒', supplier: '华东医药股份有限公司', time: '2026-10-15' },
    { id: 'PP-002', drugName: '硝苯地平缓释片（降压药）', quantity: '200 盒（30 片/盒）', unitPrice: '15.00 元/盒', supplier: '浙江医药股份有限公司', time: '2026-10-15' },
    { id: 'PP-003', drugName: '二甲双胍缓释片（降糖药）', quantity: '150 盒（60 片/盒）', unitPrice: '20.00 元/盒', supplier: '华东医药股份有限公司', time: '2026-10-16' },
    { id: 'PP-004', drugName: '布地奈德福莫特罗吸入剂（慢阻肺用药）', quantity: '50 支', unitPrice: '180.00 元/支', supplier: '阿斯利康制药有限公司', time: '2026-10-16' },
    { id: 'PP-005', drugName: '0.9% 氯化钠注射液（500ml）', quantity: '500 瓶', unitPrice: '2.00 元/瓶', supplier: '华润双鹤药业股份有限公司', time: '2026-10-17' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/dispensing - 药品发药 5 条 */
async function handlePharmacyDispensing(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PD-001', prescriptionNo: 'RX-2026-009012', drug: '阿莫西林胶囊 0.25g × 24 粒（每日 3 次，每次 2 粒）', quantity: '1 盒（24 粒）', dispenser: '赵***（主管药师）', time: '2026-10-20 11:00:20' },
    { id: 'PD-002', prescriptionNo: 'RX-2026-009013', drug: '硝苯地平缓释片 20mg × 30 片（每日 1 次，每次 1 片）', quantity: '1 盒（30 片）', dispenser: '赵***（主管药师）', time: '2026-10-20 11:05:30' },
    { id: 'PD-003', prescriptionNo: 'RX-2026-009014', drug: '二甲双胍缓释片 0.5g × 60 片（每日 2 次，每次 1 片）', quantity: '1 盒（60 片）', dispenser: '钱***（药师）', time: '2026-10-20 11:10:45' },
    { id: 'PD-004', prescriptionNo: 'RX-2026-009015', drug: '布地奈德福莫特罗吸入剂 160/4.5μg × 1 支（每日 2 次，每次 1 吸）', quantity: '1 支', dispenser: '钱***（药师）', time: '2026-10-20 11:15:00' },
    { id: 'PD-005', prescriptionNo: 'RX-2026-009016', drug: '0.9% 氯化钠注射液 500ml × 2 瓶（静脉滴注，每日 1 次）', quantity: '2 瓶（500ml/瓶）', dispenser: '孙***（药士）', time: '2026-10-20 11:20:15' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/trainings - 员工培训 5 条（复数路径） */
async function handleHrTrainings(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HRT-001', trainingName: '电子病历五级评审标准培训', participant: '全院医护人员（共 320 人）', hours: '4 学时', score: '平均 92 分（合格率 98%）', time: '2026-10-15 至 2026-10-16' },
    { id: 'HRT-002', trainingName: '医疗安全（不良）事件报告制度培训', participant: '临床科室医护人员（共 180 人）', hours: '2 学时', score: '平均 88 分（合格率 95%）', time: '2026-10-10 至 2026-10-11' },
    { id: 'HRT-003', trainingName: 'AI 临床决策支持系统使用培训', participant: '内科医生（共 60 人）', hours: '3 学时', score: '平均 90 分（合格率 96%）', time: '2026-10-08' },
    { id: 'HRT-004', trainingName: '院感防控知识培训（秋冬季专项）', participant: '全院医护人员（共 350 人）', hours: '2 学时', score: '平均 95 分（合格率 100%）', time: '2026-10-05' },
    { id: 'HRT-005', trainingName: '新员工岗前培训（2026 年秋季批次）', participant: '新入职员工（共 45 人）', hours: '24 学时（3 天）', score: '平均 85 分（合格率 92%）', time: '2026-09-20 至 2026-09-22' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/recruitment - 招聘管理 5 条 */
async function handleHrRecruitment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HRR-001', positionName: '心内科主治医师', department: '心内科', headcount: '2 人', status: '招聘中（已收到简历 15 份，面试 5 人）', publishTime: '2026-09-01' },
    { id: 'HRR-002', positionName: '普外科副主任医师', department: '普外科', headcount: '1 人', status: '招聘中（已收到简历 8 份，面试 3 人）', publishTime: '2026-09-15' },
    { id: 'HRR-003', positionName: '主管护师（心内科）', department: '心内科', headcount: '3 人', status: '已截止（已完成招聘，3 人已入职）', publishTime: '2026-08-01' },
    { id: 'HRR-004', positionName: '信息科系统工程师', department: '信息科', headcount: '2 人', status: '招聘中（已收到简历 20 份，面试 8 人）', publishTime: '2026-09-20' },
    { id: 'HRR-005', positionName: '药师（门诊药房）', department: '药学部', headcount: '1 人', status: '待发布（计划 11 月发布）', publishTime: '—（预计 2026-11-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m334Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/purchasing', handle: handlePharmacyPurchasing, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/dispensing', handle: handlePharmacyDispensing, auth: true },
  { method: 'GET', path: '/api/v1/hr/trainings', handle: handleHrTrainings, auth: true },
  { method: 'GET', path: '/api/v1/hr/recruitment', handle: handleHrRecruitment, auth: true },
];
