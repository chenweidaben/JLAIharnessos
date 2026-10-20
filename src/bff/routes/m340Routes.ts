/**
 * 健澜科技 jlmedaios - M340 患者 360 + 就诊记录域
 *
 * 患者档案/过敏史/家族史/生命体征（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/profile - 患者档案 5 条 */
async function handlePatientProfile(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PP-001', name: '张***', gender: '男', age: 65, contact: '138****1234', address: '杭州市西湖区文三路 *** 号' },
    { id: 'PP-002', name: '王***', gender: '女', age: 58, contact: '139****5678', address: '杭州市拱墅区莫干山路 *** 号' },
    { id: 'PP-003', name: '刘***', gender: '男', age: 72, contact: '137****9012', address: '杭州市滨江区江南大道 *** 号' },
    { id: 'PP-004', name: '孙***', gender: '女', age: 45, contact: '136****3456', address: '杭州市余杭区文一西路 *** 号' },
    { id: 'PP-005', name: '吴***', gender: '男', age: 60, contact: '135****7890', address: '杭州市萧山区市心中路 *** 号' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/allergies - 过敏史 5 条 */
async function handlePatientAllergies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PA-001', patient: '张***（男，65 岁）', allergen: '青霉素（注射用）', reaction: '皮疹、瘙痒（轻度）', severity: '轻度', diagnosisTime: '2018-05-10' },
    { id: 'PA-002', patient: '王***（女，58 岁）', allergen: '磺胺类药物（复方新诺明）', reaction: '发热、皮疹（中度）', severity: '中度', diagnosisTime: '2015-03-20' },
    { id: 'PA-003', patient: '刘***（男，72 岁）', allergen: '海鲜（虾、蟹）', reaction: '腹痛、腹泻、荨麻疹（中度）', severity: '中度', diagnosisTime: '2010-07-15' },
    { id: 'PA-004', patient: '孙***（女，45 岁）', allergen: '花粉（春季花粉）', reaction: '打喷嚏、流鼻涕、眼痒（轻度）', severity: '轻度', diagnosisTime: '2020-04-01' },
    { id: 'PA-005', patient: '吴***（男，60 岁）', allergen: '造影剂（碘海醇）', reaction: '胸闷、呼吸困难（重度，过敏性休克前兆）', severity: '重度', diagnosisTime: '2022-09-08' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/family - 家族史 5 条 */
async function handlePatientFamily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PF-001', patient: '张***（男，65 岁）', relative: '父亲', disease: '高血压（原发性高血压）', relation: '父子', onsetAge: '55 岁发病，现 80 岁' },
    { id: 'PF-002', patient: '王***（女，58 岁）', relative: '母亲', disease: '2 型糖尿病', relation: '母女', onsetAge: '60 岁发病，现 85 岁' },
    { id: 'PF-003', patient: '刘***（男，72 岁）', relative: '哥哥', disease: '冠心病（急性心肌梗死）', relation: '兄弟', onsetAge: '65 岁发病，70 岁去世' },
    { id: 'PF-004', patient: '孙***（女，45 岁）', relative: '姐姐', disease: '甲状腺癌（乳头状癌）', relation: '姐妹', onsetAge: '40 岁发病，手术治愈' },
    { id: 'PF-005', patient: '吴***（男，60 岁）', relative: '父亲', disease: '肺癌（腺癌）', relation: '父子', onsetAge: '70 岁发病，75 岁去世' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/vitals - 生命体征 5 条 */
async function handlePatientVitals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PV-001', patient: '张***（男，65 岁）', temperature: '36.8℃（正常）', bloodPressure: '135/85mmHg（轻度偏高）', heartRate: '72 次/分（正常）', measureTime: '2026-10-20 08:00:00（入院时测量）' },
    { id: 'PV-002', patient: '王***（女，58 岁）', temperature: '36.5℃（正常）', bloodPressure: '120/70mmHg（正常）', heartRate: '68 次/分（正常）', measureTime: '2026-10-20 08:30:00（入院时测量）' },
    { id: 'PV-003', patient: '刘***（男，72 岁）', temperature: '37.2℃（低热）', bloodPressure: '150/90mmHg（高血压）', heartRate: '80 次/分（正常）', measureTime: '2026-10-20 09:00:00（术后第 3 天测量）' },
    { id: 'PV-004', patient: '孙***（女，45 岁）', temperature: '36.6℃（正常）', bloodPressure: '115/75mmHg（正常）', heartRate: '70 次/分（正常）', measureTime: '2026-10-20 09:30:00（入院时测量）' },
    { id: 'PV-005', patient: '吴***（男，60 岁）', temperature: '36.9℃（正常）', bloodPressure: '140/90mmHg（临界高血压）', heartRate: '75 次/分（正常）', measureTime: '2026-10-20 10:00:00（入院时测量）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m340Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/profile', handle: handlePatientProfile, auth: true },
  { method: 'GET', path: '/api/v1/patient/allergies', handle: handlePatientAllergies, auth: true },
  { method: 'GET', path: '/api/v1/patient/family', handle: handlePatientFamily, auth: true },
  { method: 'GET', path: '/api/v1/patient/vitals', handle: handlePatientVitals, auth: true },
];
