/**
 * 健澜科技 jlmedaios - M224 病理深度 + 体检深度 + 科研教学深度
 *
 * 病理报告详情/标本追踪 + 体检套餐/体检报告详情 + 伦理审查/科研论文 + 实习生/教学考试
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、病理深度 ==================== */

/** GET /api/v1/pathology/detail - 病理报告详情 */
async function handlePathologyDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: { name: '张演示', gender: '男', age: 65, patientId: 'P001' },
    specimenType: '手术标本（胃癌根治术）',
    diagnosis: '胃腺癌（中分化），侵犯浆膜层，淋巴结转移 3/15',
    ihc: [
      { marker: 'ER', result: '阴性' },
      { marker: 'PR', result: '阴性' },
      { marker: 'HER2', result: '1+（阴性）' },
      { marker: 'Ki-67', result: '30%（阳性）' },
    ],
    molecular: { egfr: '野生型', kras: '野生型', braf: 'V600E 阴性' },
    pathologist: '病理科-王主任',
    reportTime: '2026-10-20 14:00',
  }));
}

/** GET /api/v1/pathology/specimen-track - 标本追踪 */
async function handlePathologySpecimenTrack(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const specimens = [
    { id: 'SPT-001', specimenNo: 'PAT-2026-1020-001', type: '手术标本', receiveTime: '2026-10-20 09:00', grossingTime: '2026-10-20 10:00', embeddingTime: '2026-10-20 11:00', sectionTime: '2026-10-20 13:00', stainingTime: '2026-10-20 14:00', status: '已出报告' },
    { id: 'SPT-002', specimenNo: 'PAT-2026-1020-002', type: '穿刺标本', receiveTime: '2026-10-20 10:00', grossingTime: '2026-10-20 11:00', embeddingTime: '2026-10-20 12:00', sectionTime: '-', stainingTime: '-', status: '切片中' },
    { id: 'SPT-003', specimenNo: 'PAT-2026-1020-003', type: '细胞学标本', receiveTime: '2026-10-20 11:00', grossingTime: '-', embeddingTime: '-', sectionTime: '-', stainingTime: '-', status: '取材中' },
    { id: 'SPT-004', specimenNo: 'PAT-2026-1019-005', type: '手术标本', receiveTime: '2026-10-19 09:00', grossingTime: '2026-10-19 10:00', embeddingTime: '2026-10-19 11:00', sectionTime: '2026-10-19 13:00', stainingTime: '2026-10-19 14:00', status: '已出报告' },
    { id: 'SPT-005', specimenNo: 'PAT-2026-1019-006', type: '穿刺标本', receiveTime: '2026-10-19 10:00', grossingTime: '2026-10-19 11:00', embeddingTime: '2026-10-19 12:00', sectionTime: '2026-10-19 13:30', stainingTime: '-', status: '已染色' },
  ];

  return json(ok({ specimens, totalCount: specimens.length }));
}

/* ==================== 二、体检深度 ==================== */

/** GET /api/v1/physical/packages - 体检套餐 */
async function handlePhysicalPackages(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const packages = [
    { id: 'PKG-001', name: '入职体检套餐', price: 280, items: 15, target: '新入职员工', sold: 350 },
    { id: 'PKG-002', name: '基础健康套餐', price: 580, items: 25, target: '普通人群年度体检', sold: 1200 },
    { id: 'PKG-003', name: '豪华深度套餐', price: 1280, items: 45, target: '中高端人群', sold: 450 },
    { id: 'PKG-004', name: '老年关爱套餐', price: 980, items: 35, target: '60 岁以上老年人', sold: 680 },
    { id: 'PKG-005', name: '女性专项套餐', price: 780, items: 30, target: '20-60 岁女性', sold: 820 },
  ];

  return json(ok({ packages, totalCount: packages.length }));
}

/** GET /api/v1/physical/detail - 体检报告详情 */
async function handlePhysicalDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    person: { name: '张演示', gender: '男', age: 45 },
    departments: {
      internal: '心肺听诊无异常，腹软无压痛',
      surgery: '皮肤无黄染，淋巴结未触及肿大',
      ophthalmology: '双眼视力 1.0，眼压正常',
      ent: '外耳道无异常，鼻腔通畅',
      dental: '龋齿 1 颗，建议补牙',
      lab: '血常规正常，肝功能正常，空腹血糖 6.8mmol/L（偏高）',
      imaging: '胸部 CT 未见明显异常，腹部 B 超轻度脂肪肝',
    },
    abnormalItems: [
      '空腹血糖 6.8mmol/L（偏高，参考值 3.9-6.1）',
      '轻度脂肪肝（腹部 B 超）',
      '龋齿 1 颗（口腔科）',
    ],
    doctorAdvice: '1. 控制饮食，减少高糖高脂食物 2. 加强运动，每周 3-5 次有氧运动 3. 3 个月后复查血糖 4. 口腔科就诊补牙',
    conclusion: '基本健康，建议定期复查',
  }));
}

/* ==================== 三、科研深度 ==================== */

/** GET /api/v1/research/ethics - 伦理审查 */
async function handleResearchEthics(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const ethics = [
    { id: 'ETH-001', project: '冠心病介入治疗预后研究', pi: '李主任', type: '初始审查', date: '2025-01-15', result: '通过', validUntil: '2027-01-14' },
    { id: 'ETH-002', project: '糖尿病早期筛查模型构建', pi: '王医生', type: '初始审查', date: '2025-06-20', result: '通过', validUntil: '2026-12-19' },
    { id: 'ETH-003', project: 'AI 辅助肺结节检测临床验证', pi: '赵主任', type: '修正案审查', date: '2026-09-10', result: '修改后通过', validUntil: '2028-02-28' },
    { id: 'ETH-004', project: '高血压用药依从性干预研究', pi: '张医生', type: '跟踪审查', date: '2026-08-01', result: '通过', validUntil: '2027-07-31' },
    { id: 'ETH-005', project: '老年患者跌倒风险评估研究', pi: '陈护士', type: '初始审查', date: '2025-09-05', result: '通过', validUntil: '2027-09-04' },
  ];

  return json(ok({ ethics, totalCount: ethics.length }));
}

/** GET /api/v1/research/papers - 科研论文 */
async function handleResearchPapers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const papers = [
    { id: 'PAP-001', title: '冠心病介入治疗远期预后影响因素分析', authors: '李主任等', journal: '中华心血管病杂志', impactFactor: 2.8, date: '2026-03-15', indexing: '中文核心' },
    { id: 'PAP-002', title: 'AI 辅助肺结节检测的临床验证研究', authors: '赵主任等', journal: 'Journal of Medical Imaging', impactFactor: 4.2, date: '2026-06-20', indexing: 'SCI' },
    { id: 'PAP-003', title: '糖尿病早期筛查模型构建与验证', authors: '王医生等', journal: '中国糖尿病杂志', impactFactor: 1.8, date: '2026-08-10', indexing: '统计源' },
    { id: 'PAP-004', title: '高血压用药依从性干预效果评价', authors: '张医生等', journal: '中国药房', impactFactor: 1.5, date: '2026-05-05', indexing: '统计源' },
    { id: 'PAP-005', title: '老年患者跌倒风险评估量表的编制', authors: '陈护士等', journal: '中华护理杂志', impactFactor: 2.5, date: '2026-09-18', indexing: '中文核心' },
  ];

  return json(ok({ papers, totalCount: papers.length }));
}

/* ==================== 四、教学深度 ==================== */

/** GET /api/v1/education/interns - 实习生管理 */
async function handleEducationInterns(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const interns = [
    { id: 'INT-001', name: '小明', school: '浙江大学医学院', major: '临床医学', rotationDept: '心内科', mentor: '李主任', status: '在科' },
    { id: 'INT-002', name: '小红', school: '温州医科大学', major: '护理学', rotationDept: '心内科', mentor: '王护士', status: '在科' },
    { id: 'INT-003', name: '小华', school: '浙江中医药大学', major: '药学', rotationDept: '药剂科', mentor: '张药师', status: '已出科' },
    { id: 'INT-004', name: '小强', school: '杭州医学院', major: '医学检验', rotationDept: '检验科', mentor: '赵主任', status: '在科' },
    { id: 'INT-005', name: '小丽', school: '浙江大学医学院', major: '临床医学', rotationDept: '普外科', mentor: '张主任', status: '休假' },
  ];

  return json(ok({ interns, totalCount: interns.length }));
}

/** GET /api/v1/education/exams - 教学考试 */
async function handleEducationExams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const exams = [
    { id: 'EXM-001', name: '心内科出科考试', subject: '内科学（心血管）', participants: 25, avgScore: 82.5, passRate: 96.0 },
    { id: 'EXM-002', name: '普外科出科考试', subject: '外科学（普外）', participants: 20, avgScore: 78.3, passRate: 90.0 },
    { id: 'EXM-003', name: '中期考核（临床综合）', subject: '诊断学', participants: 50, avgScore: 80.1, passRate: 92.0 },
  ];

  return json(ok({ exams, totalCount: exams.length }));
}

export const m224Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pathology/detail', handle: handlePathologyDetail, auth: true },
  { method: 'GET', path: '/api/v1/pathology/specimen-track', handle: handlePathologySpecimenTrack, auth: true },
  { method: 'GET', path: '/api/v1/physical/packages', handle: handlePhysicalPackages, auth: true },
  { method: 'GET', path: '/api/v1/physical/detail', handle: handlePhysicalDetail, auth: true },
  { method: 'GET', path: '/api/v1/research/ethics', handle: handleResearchEthics, auth: true },
  { method: 'GET', path: '/api/v1/research/papers', handle: handleResearchPapers, auth: true },
  { method: 'GET', path: '/api/v1/education/interns', handle: handleEducationInterns, auth: true },
  { method: 'GET', path: '/api/v1/education/exams', handle: handleEducationExams, auth: true },
];
