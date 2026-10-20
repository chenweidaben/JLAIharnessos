/**
 * 健澜科技 jlmedaios - M328 科研教学 + 互联网医院域
 *
 * 科研经费 + 培训记录 + 互联网医院处方（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/research/grants - 科研经费 5 条 */
async function handleResearchGrants(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RG-001', projectName: 'AI 辅助诊断冠心病的临床研究', fundingSource: '国家自然科学基金（面上项目）', amount: '50.00 万元', arrivalTime: '2026-03-15', usageStatus: '已使用 25.00 万元（50%）' },
    { id: 'RG-002', projectName: '基于真实世界数据的糖尿病并发症预测模型', fundingSource: '浙江省卫健委科研项目', amount: '20.00 万元', arrivalTime: '2026-04-01', usageStatus: '已使用 8.00 万元（40%）' },
    { id: 'RG-003', projectName: '中医针灸治疗脑卒中后康复的随机对照研究', fundingSource: '杭州市科技局重点研发计划', amount: '30.00 万元', arrivalTime: '2026-05-10', usageStatus: '已使用 12.00 万元（40%）' },
    { id: 'RG-004', projectName: '互联网医院慢病管理模式的卫生经济学评价', fundingSource: '院级科研基金', amount: '5.00 万元', arrivalTime: '2026-06-01', usageStatus: '已使用 2.00 万元（40%）' },
    { id: 'RG-005', projectName: '基于 FHIR 的医疗数据互联互通标准研究', fundingSource: '院级科研基金', amount: '3.00 万元', arrivalTime: '2026-07-01', usageStatus: '已使用 0.50 万元（17%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/training - 培训记录 5 条 */
async function handleTeachingTraining(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TT-001', trainingName: '电子病历五级评审标准培训', participant: '全院医护人员（共 320 人）', hours: '4 学时', score: '平均 92 分（合格率 98%）', time: '2026-10-15 至 2026-10-16' },
    { id: 'TT-002', trainingName: '医疗安全（不良）事件报告制度培训', participant: '临床科室医护人员（共 180 人）', hours: '2 学时', score: '平均 88 分（合格率 95%）', time: '2026-10-10 至 2026-10-11' },
    { id: 'TT-003', trainingName: 'AI 临床决策支持系统使用培训', participant: '内科医生（共 60 人）', hours: '3 学时', score: '平均 90 分（合格率 96%）', time: '2026-10-08' },
    { id: 'TT-004', trainingName: '院感防控知识培训（秋冬季专项）', participant: '全院医护人员（共 350 人）', hours: '2 学时', score: '平均 95 分（合格率 100%）', time: '2026-10-05' },
    { id: 'TT-005', trainingName: '新员工岗前培训（2026 年秋季批次）', participant: '新入职员工（共 45 人）', hours: '24 学时（3 天）', score: '平均 85 分（合格率 92%）', time: '2026-09-20 至 2026-09-22' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/internet/hospital-orders - 互联网医院处方 5 条 */
async function handleInternetHospitalOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IHO-001', orderNo: 'RX-2026-INT-000001', patient: '张***（慢性高血压复诊）', doctor: '李***（心内科主治医师）', drug: '硝苯地平缓释片 20mg × 30 片（每日 1 次，每次 1 片）', status: '已审核（药房已调配）' },
    { id: 'IHO-002', orderNo: 'RX-2026-INT-000002', patient: '王***（糖尿病复诊）', doctor: '陈***（内分泌科副主任医师）', drug: '二甲双胍缓释片 0.5g × 60 片（每日 2 次，每次 1 片）', status: '已审核（药房已调配）' },
    { id: 'IHO-003', orderNo: 'RX-2026-INT-000003', patient: '刘***（慢阻肺复诊）', doctor: '赵***（呼吸内科主任医师）', drug: '布地奈德福莫特罗吸入剂 160/4.5μg × 1 支（每日 2 次，每次 1 吸）', status: '待审核' },
    { id: 'IHO-004', orderNo: 'RX-2026-INT-000004', patient: '孙***（慢性胃炎复诊）', doctor: '周***（消化内科主治医师）', drug: '奥美拉唑肠溶胶囊 20mg × 14 粒（每日 2 次，每次 1 粒）', status: '已审核（药房已调配）' },
    { id: 'IHO-005', orderNo: 'RX-2026-INT-000005', patient: '吴***（过敏性鼻炎复诊）', doctor: '郑***（耳鼻喉科副主任医师）', drug: '糠酸莫米松鼻喷雾剂 × 1 支（每日 1 次，每次 2 喷）', status: '已审核（药房已调配）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m328Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/research/grants', handle: handleResearchGrants, auth: true },
  { method: 'GET', path: '/api/v1/teaching/training', handle: handleTeachingTraining, auth: true },
  { method: 'GET', path: '/api/v1/internet/hospital-orders', handle: handleInternetHospitalOrders, auth: true },
];
