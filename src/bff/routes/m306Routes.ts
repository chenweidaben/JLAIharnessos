/**
 * 健澜科技 jlmedaios - M306 科研教学域
 *
 * 科研项目列表/论文列表/科研经费/课程列表/考试记录/学位管理
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/research/projects-list - 科研项目列表 5 条 */
async function handleResearchProjectsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RP-001', name: '基于深度学习的肺部 CT 影像辅助诊断研究', pi: '李***主任医师', funding: '50 万元', status: '在研', period: '2025.06 - 2027.05' },
    { id: 'RP-002', name: '老年慢阻肺患者肺康复方案优化研究', pi: '刘***主任医师', funding: '30 万元', status: '在研', period: '2025.01 - 2026.12' },
    { id: 'RP-003', name: '基层医院胸痛中心建设模式研究', pi: '陈***副主任医师', funding: '20 万元', status: '已结题', period: '2024.01 - 2025.12' },
    { id: 'RP-004', name: '数字疗法在糖尿病管理中的应用研究', pi: '王***主治医师', funding: '15 万元', status: '在研', period: '2026.01 - 2027.12' },
    { id: 'RP-005', name: '中医药干预失眠的临床随机对照研究', pi: '张***副主任医师', funding: '10 万元', status: '在研', period: '2025.09 - 2027.08' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/papers - 论文列表 5 条 */
async function handleResearchPapers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PA-001', title: 'AI-Assisted Diagnosis of Lung Nodules on CT Images', authors: 'Li et al.', journal: 'European Radiology', year: 2026, citations: 12 },
    { id: 'PA-002', title: '肺康复对慢阻肺患者生活质量的影响', authors: '刘**, 王**', journal: '中华结核和呼吸杂志', year: 2025, citations: 8 },
    { id: 'PA-003', title: '基层胸痛中心建设实践与效果评价', authors: '陈**, 张**', journal: '中国循环杂志', year: 2025, citations: 6 },
    { id: 'PA-004', title: '数字疗法在 2 型糖尿病管理中的应用', authors: '王**, 李**', journal: '中华内分泌代谢杂志', year: 2026, citations: 3 },
    { id: 'PA-005', title: '酸枣仁汤治疗失眠的临床随机对照研究', authors: '张**, 赵**', journal: '中国中西医结合杂志', year: 2026, citations: 2 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/funds - 科研经费 5 条 */
async function handleResearchFunds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RF-001', project: '基于深度学习的肺部 CT 影像辅助诊断研究', source: '省自然科学基金', amount: '50 万元', receivedDate: '2025-07', usage: '已使用 28 万元（56%）' },
    { id: 'RF-002', project: '老年慢阻肺患者肺康复方案优化研究', source: '市卫健委科研项目', amount: '30 万元', receivedDate: '2025-03', usage: '已使用 18 万元（60%）' },
    { id: 'RF-003', project: '基层医院胸痛中心建设模式研究', source: '市医学会课题', amount: '20 万元', receivedDate: '2024-04', usage: '已使用 20 万元（100%，已结题）' },
    { id: 'RF-004', project: '数字疗法在糖尿病管理中的应用研究', source: '院级青年基金', amount: '15 万元', receivedDate: '2026-02', usage: '已使用 5 万元（33%）' },
    { id: 'RF-005', project: '中医药干预失眠的临床随机对照研究', source: '省中医药管理局项目', amount: '10 万元', receivedDate: '2025-10', usage: '已使用 4 万元（40%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/education/courses - 课程列表 5 条 */
async function handleEducationCourses(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EC-001', name: '最新冠心病诊疗指南解读', lecturer: '全国知名专家（线上）', hours: 4, participants: 120, time: '2026-10-25' },
    { id: 'EC-002', name: '腹腔镜手术进阶培训', lecturer: '省人民医院专家（线下）', hours: 8, participants: 30, time: '2026-11-02' },
    { id: 'EC-003', name: '医疗法律法规与执业风险防范', lecturer: '医务科主任（院内）', hours: 2, participants: 200, time: '2026-10-22' },
    { id: 'EC-004', name: '抗菌药物合理使用培训', lecturer: '药剂科主任（院内）', hours: 3, participants: 150, time: '2026-10-28' },
    { id: 'EC-005', name: '护理质量控制与 NQI 指标解读', lecturer: '护理部主任（院内）', hours: 2, participants: 180, time: '2026-11-05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/education/exams - 考试记录 5 条 */
async function handleEducationExams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EE-001', name: '2026 年医师定期考核（理论）', participants: 280, passRate: '96.4%', avgScore: '85.6 分', time: '2026-09-15' },
    { id: 'EE-002', name: '2026 年护士执业资格院内模拟考', participants: 320, passRate: '92.5%', avgScore: '82.3 分', time: '2026-09-20' },
    { id: 'EE-003', name: '医疗法律法规知识竞赛', participants: 150, passRate: '100%', avgScore: '88.5 分', time: '2026-10-10' },
    { id: 'EE-004', name: '三基三严考核（内科）', participants: 120, passRate: '98.3%', avgScore: '87.2 分', time: '2026-10-15' },
    { id: 'EE-005', name: '院感知识全员考核', participants: 500, passRate: '99.0%', avgScore: '90.1 分', time: '2026-10-18' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/education/degrees - 学位管理 5 条 */
async function handleEducationDegrees(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ED-001', name: '李***', degree: '博士（临床医学）', major: '心血管内科', grantDate: '2018-06', status: '已注册（在职攻读）' },
    { id: 'ED-002', name: '陈***', degree: '硕士（外科学）', major: '普外科', grantDate: '2015-06', status: '已注册' },
    { id: 'ED-003', name: '王***', degree: '硕士（骨科学）', major: '骨科', grantDate: '2020-06', status: '已注册' },
    { id: 'ED-004', name: '刘***', degree: '博士（呼吸内科学）', major: '呼吸内科', grantDate: '2012-06', status: '已注册' },
    { id: 'ED-005', name: '张***', degree: '硕士（神经病学）', major: '神经内科', grantDate: '2019-06', status: '已注册（同等学力）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m306Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/research/projects-list', handle: handleResearchProjectsList, auth: true },
  { method: 'GET', path: '/api/v1/research/papers', handle: handleResearchPapers, auth: true },
  { method: 'GET', path: '/api/v1/research/funds', handle: handleResearchFunds, auth: true },
  { method: 'GET', path: '/api/v1/education/courses', handle: handleEducationCourses, auth: true },
  { method: 'GET', path: '/api/v1/education/exams', handle: handleEducationExams, auth: true },
  { method: 'GET', path: '/api/v1/education/degrees', handle: handleEducationDegrees, auth: true },
];
