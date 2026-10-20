/**
 * 健澜科技 jlmedaios - M376 P1 业务扩展：老年医学深度打磨
 *
 * 老年照护计划/共病管理/衰弱评估（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/geriatrics/care-plan - 老年照护计划 5 条 */
async function handleGeriatricsCarePlan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GCP-001', elderlyName: '张***（75 岁男性，高血压 + 糖尿病患者）', careLevel: '二级照护（生活半自理）', serviceItems: '日常用药管理（降压药 + 降糖药）+ 血压监测（每日 1 次）+ 血糖监测（每周 2 次）+ 定期复诊（每月 1 次）', frequency: '每日用药管理 + 每日血压监测 + 每周 2 次血糖监测 + 每月 1 次复诊', responsiblePerson: '家属王***（子女）+ 社区护士李***' },
    { id: 'GCP-002', elderlyName: '李***（80 岁女性，脑卒中后偏瘫患者）', careLevel: '一级照护（生活不能自理）', serviceItems: '日常起居照料（饮食、洗漱、翻身）+ 用药管理（抗血小板药 + 他汀类药）+ 康复训练（每日 1 次）+ 定期复诊（每 2 周 1 次）', frequency: '每日起居照料 + 每日用药管理 + 每日康复训练 + 每 2 周 1 次复诊', responsiblePerson: '保姆赵***（住家保姆）+ 社区医生孙***' },
    { id: 'GCP-003', elderlyName: '王***（78 岁男性，冠心病 + 心力衰竭患者）', careLevel: '二级照护（生活半自理）', serviceItems: '日常用药管理（硝酸酯类 + β 受体阻滞剂 + 利尿剂）+ 血压监测（每日 2 次）+ 体重监测（每日 1 次）+ 定期复诊（每月 1 次）', frequency: '每日用药管理 + 每日 2 次血压监测 + 每日体重监测 + 每月 1 次复诊', responsiblePerson: '家属刘***（配偶）+ 社区护士周***' },
    { id: 'GCP-004', elderlyName: '刘***（82 岁女性，骨质疏松症患者）', careLevel: '三级照护（生活基本自理）', serviceItems: '日常用药管理（钙剂 + 维生素 D + 双膦酸盐）+ 跌倒预防（居家环境改造）+ 定期复诊（每 3 个月 1 次）', frequency: '每日用药管理 + 每日跌倒预防 + 每 3 个月 1 次复诊', responsiblePerson: '家属陈***（子女）+ 社区医生吴***' },
    { id: 'GCP-005', elderlyName: '陈***（70 岁男性，慢性阻塞性肺疾病患者）', careLevel: '三级照护（生活基本自理）', serviceItems: '日常用药管理（支气管扩张剂 + 吸入性糖皮质激素）+ 肺功能锻炼（每日 2 次）+ 定期复诊（每月 1 次）', frequency: '每日用药管理 + 每日 2 次肺功能锻炼 + 每月 1 次复诊', responsiblePerson: '家属杨***（配偶）+ 社区护士郑***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/geriatrics/comorbidity - 共病管理 5 条 */
async function handleGeriatricsComorbidity(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GCM-001', elderlyName: '张***（75 岁男性）', diseaseCount: '3 种', primaryDisease: '高血压（3 级，极高危）+ 2 型糖尿病 + 高脂血症', medicationCount: '5 种', doctor: '老年科主任医师李***' },
    { id: 'GCM-002', elderlyName: '李***（80 岁女性）', diseaseCount: '4 种', primaryDisease: '脑梗死（后遗症期）+ 高血压 + 2 型糖尿病 + 骨质疏松症', medicationCount: '7 种', doctor: '老年科副主任医师赵***' },
    { id: 'GCM-003', elderlyName: '王***（78 岁男性）', diseaseCount: '3 种', primaryDisease: '冠心病（稳定性心绞痛）+ 慢性心力衰竭 + 高血压', medicationCount: '6 种', doctor: '老年科主任医师孙***' },
    { id: 'GCM-004', elderlyName: '刘***（82 岁女性）', diseaseCount: '2 种', primaryDisease: '骨质疏松症 + 高血压', medicationCount: '4 种', doctor: '老年科副主任医师周***' },
    { id: 'GCM-005', elderlyName: '陈***（70 岁男性）', diseaseCount: '2 种', primaryDisease: '慢性阻塞性肺疾病 + 高血压', medicationCount: '4 种', doctor: '老年科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/geriatrics/frail - 衰弱评估 5 条 */
async function handleGeriatricsFrail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GF-001', elderlyName: '张***（75 岁男性，高血压 + 糖尿病患者）', assessmentResult: 'FRAIL 量表评分 4 分（0-5 分）', level: '衰弱（3-5 分为衰弱）', intervention: '营养支持（高蛋白饮食）+ 运动训练（抗阻运动）+ 定期复查（每月 1 次）', doctor: '老年科主任医师李***' },
    { id: 'GF-002', elderlyName: '李***（80 岁女性，脑卒中后偏瘫患者）', assessmentResult: 'FRAIL 量表评分 5 分（0-5 分）', level: '严重衰弱（5 分为严重衰弱）', intervention: '营养支持（高蛋白饮食 + 营养补充剂）+ 康复训练（被动运动）+ 定期复查（每 2 周 1 次）', doctor: '老年科副主任医师赵***' },
    { id: 'GF-003', elderlyName: '王***（78 岁男性，冠心病 + 心力衰竭患者）', assessmentResult: 'FRAIL 量表评分 3 分（0-5 分）', level: '衰弱（3-5 分为衰弱）', intervention: '营养支持（高蛋白饮食）+ 运动训练（有氧运动）+ 定期复查（每月 1 次）', doctor: '老年科主任医师孙***' },
    { id: 'GF-004', elderlyName: '刘***（82 岁女性，骨质疏松症患者）', assessmentResult: 'FRAIL 量表评分 2 分（0-5 分）', level: '衰弱前期（1-2 分为衰弱前期）', intervention: '营养支持（高蛋白饮食）+ 运动训练（抗阻运动）+ 定期复查（每 3 个月 1 次）', doctor: '老年科副主任医师周***' },
    { id: 'GF-005', elderlyName: '陈***（70 岁男性，慢性阻塞性肺疾病患者）', assessmentResult: 'FRAIL 量表评分 1 分（0-5 分）', level: '衰弱前期（1-2 分为衰弱前期）', intervention: '营养支持（高蛋白饮食）+ 运动训练（肺功能锻炼）+ 定期复查（每 3 个月 1 次）', doctor: '老年科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m376Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/geriatrics/care-plan', handle: handleGeriatricsCarePlan, auth: true },
  { method: 'GET', path: '/api/v1/geriatrics/comorbidity', handle: handleGeriatricsComorbidity, auth: true },
  { method: 'GET', path: '/api/v1/geriatrics/frail', handle: handleGeriatricsFrail, auth: true },
];
