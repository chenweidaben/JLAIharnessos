/**
 * 健澜科技 jlmedaios - M220 AI 深度 + 科研教学
 *
 * AI 病历书写辅助/诊断建议 + 在研项目/教学课程/教学查房
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、AI 深度 ==================== */

/** GET /api/v1/ai/medical-record-helper - AI 病历书写辅助 */
async function handleAiMedicalRecordHelper(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    input: {
      chiefComplaint: '胸闷 3 天，加重伴胸痛 2 小时',
      presentIllness: '患者 3 天前无明显诱因出现胸闷，活动后加重，休息后缓解。2 小时前胸闷加重，伴胸骨后压榨样疼痛，向左肩放射，伴气短、出汗。无恶心呕吐。',
      pastHistory: '高血压病史 5 年，最高 160/100 mmHg，规律服药。糖尿病史 3 年。吸烟 30 年，20 支/日。',
    },
    output: {
      admissionRecord: '患者，男，65 岁，因"胸闷 3 天，加重伴胸痛 2 小时"入院。患者 3 天前无明显诱因出现胸闷...（详见病历初稿）',
      suggestedDiagnosis: '1. 冠心病 急性冠脉综合征 2. 高血压病 3 级（很高危） 3. 2 型糖尿病',
      suggestedTreatment: '1. 心电监护 2. 抗血小板（阿司匹林 300mg 嚼服） 3. 抗凝（低分子肝素） 4. 急诊冠脉造影',
    },
  }));
}

/** GET /api/v1/ai/diagnosis-suggest - AI 诊断建议 */
async function handleAiDiagnosisSuggest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    input: {
      symptoms: ['胸闷', '胸痛', '气短'],
    },
    differentialDiagnosis: [
      { diagnosis: '冠心病/心绞痛', confidence: 85.5, keyFindings: '胸骨后压榨样疼痛，向左肩放射，活动后加重' },
      { diagnosis: '急性心肌梗死', confidence: 72.3, keyFindings: '持续胸痛 >30 分钟，伴出汗、气短' },
      { diagnosis: '肺栓塞', confidence: 45.8, keyFindings: '突发呼吸困难，胸痛，D-二聚体升高' },
      { diagnosis: '主动脉夹层', confidence: 32.5, keyFindings: '撕裂样胸痛，向背部放射，血压不对称' },
      { diagnosis: '胃食管反流病', confidence: 18.2, keyFindings: '反酸、烧心，餐后加重' },
    ],
  }));
}

/* ==================== 二、科研教学 ==================== */

/** GET /api/v1/research/studies - 在研项目 */
async function handleResearchStudies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const studies = [
    { id: 'STU-001', name: '冠心病介入治疗预后研究', pi: '李主任', funding: 50.0, period: '2025-01 至 2027-12', status: '在研' },
    { id: 'STU-002', name: '糖尿病早期筛查模型构建', pi: '王医生', funding: 30.0, period: '2025-06 至 2026-12', status: '中期' },
    { id: 'STU-003', name: '高血压用药依从性干预研究', pi: '张医生', funding: 20.0, period: '2024-09 至 2026-08', status: '结题' },
    { id: 'STU-004', name: 'AI 辅助肺结节检测临床验证', pi: '赵主任', funding: 80.0, period: '2025-03 至 2028-02', status: '在研' },
    { id: 'STU-005', name: '老年患者跌倒风险评估研究', pi: '陈护士', funding: 15.0, period: '2025-09 至 2027-08', status: '在研' },
  ];

  return json(ok({ studies, totalCount: studies.length }));
}

/** GET /api/v1/education/courses - 教学课程 */
async function handleEducationCourses(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const courses = [
    { id: 'CRS-001', name: '内科学（心血管系统）', lecturer: '李主任', hours: 32, credits: 2, enrolled: 120 },
    { id: 'CRS-002', name: '外科学（普外部分）', lecturer: '张主任', hours: 40, credits: 2.5, enrolled: 95 },
    { id: 'CRS-003', name: '诊断学（体格检查）', lecturer: '王主任', hours: 24, credits: 1.5, enrolled: 150 },
    { id: 'CRS-004', name: '药理学（抗心律失常药）', lecturer: '张药师', hours: 16, credits: 1, enrolled: 80 },
    { id: 'CRS-005', name: '医学伦理学', lecturer: '医务处-王处长', hours: 8, credits: 0.5, enrolled: 200 },
  ];

  return json(ok({ courses, totalCount: courses.length }));
}

/** GET /api/v1/education/rounds - 教学查房记录 */
async function handleEducationRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rounds = [
    { id: 'RND-001', dept: '心内科', date: '2026-10-18', teacher: '李主任', case: '冠心病急性心梗', participants: { students: 8, residents: 5, trainees: 6 } },
    { id: 'RND-002', dept: '普外科', date: '2026-10-16', teacher: '张主任', case: '急性阑尾炎', participants: { students: 6, residents: 4, trainees: 5 } },
    { id: 'RND-003', dept: '呼吸科', date: '2026-10-15', teacher: '王主任', case: '社区获得性肺炎', participants: { students: 7, residents: 3, trainees: 4 } },
  ];

  return json(ok({ rounds, totalCount: rounds.length }));
}

export const m220Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ai/medical-record-helper', handle: handleAiMedicalRecordHelper, auth: true },
  { method: 'GET', path: '/api/v1/ai/diagnosis-suggest', handle: handleAiDiagnosisSuggest, auth: true },
  { method: 'GET', path: '/api/v1/research/studies', handle: handleResearchStudies, auth: true },
  { method: 'GET', path: '/api/v1/education/courses', handle: handleEducationCourses, auth: true },
  { method: 'GET', path: '/api/v1/education/rounds', handle: handleEducationRounds, auth: true },
];
