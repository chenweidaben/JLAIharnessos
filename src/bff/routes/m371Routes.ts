/**
 * 健澜科技 jlmedaios - M371 P1 业务扩展：社区医疗深度打磨
 *
 * 社区随访/健康档案/老年关怀/慢病管理/健康教育（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/community/followups - 社区随访 5 条 */
async function handleCommunityFollowups(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CF-001', followupNo: 'FLW-2026-10-20-000001', residentName: '张***（75 岁男性，高血压患者）', type: '慢病随访（高血压定期随访）', time: '2026-10-20 09:00:00（随访时间）', result: '血压控制良好（130/80 mmHg），继续服用氨氯地平 5mg/日' },
    { id: 'CF-002', followupNo: 'FLW-2026-10-20-000002', residentName: '李***（70 岁女性，糖尿病患者）', type: '慢病随访（糖尿病定期随访）', time: '2026-10-20 10:00:00（随访时间）', result: '血糖控制良好（空腹血糖 6.5 mmol/L），继续服用二甲双胍 0.5g/次、每日 3 次' },
    { id: 'CF-003', followupNo: 'FLW-2026-10-20-000003', residentName: '王***（65 岁男性，冠心病患者）', type: '术后随访（心脏支架术后 6 个月随访）', time: '2026-10-20 14:00:00（随访时间）', result: '恢复良好，无胸痛、胸闷等不适，继续服用阿司匹林 100mg/日' },
    { id: 'CF-004', followupNo: 'FLW-2026-10-20-000004', residentName: '刘***（80 岁女性，骨质疏松患者）', type: '老年关怀随访（高龄老人定期随访）', time: '2026-10-20 15:00:00（随访时间）', result: '行动能力尚可，无跌倒风险，继续服用钙剂 + 维生素 D' },
    { id: 'CF-005', followupNo: 'FLW-2026-10-20-000005', residentName: '陈***（60 岁男性，慢阻肺患者）', type: '慢病随访（慢阻肺定期随访）', time: '2026-10-20 16:00:00（随访时间）', result: '肺功能稳定，无急性加重，继续使用布地奈德吸入剂' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/health-records - 健康档案 5 条 */
async function handleCommunityHealthRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHR-001', residentName: '张***（社区居民）', gender: '男', age: '75 岁', mainDisease: '高血压（3 级，很高危）', updateTime: '2026-10-20（档案更新时间）' },
    { id: 'CHR-002', residentName: '李***（社区居民）', gender: '女', age: '70 岁', mainDisease: '糖尿病（2 型）', updateTime: '2026-10-20（档案更新时间）' },
    { id: 'CHR-003', residentName: '王***（社区居民）', gender: '男', age: '65 岁', mainDisease: '冠心病（支架术后）', updateTime: '2026-10-20（档案更新时间）' },
    { id: 'CHR-004', residentName: '刘***（社区居民）', gender: '女', age: '80 岁', mainDisease: '骨质疏松（重度）', updateTime: '2026-10-20（档案更新时间）' },
    { id: 'CHR-005', residentName: '陈***（社区居民）', gender: '男', age: '60 岁', mainDisease: '慢阻肺（稳定期）', updateTime: '2026-10-20（档案更新时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/elderly-care - 老年关怀 5 条 */
async function handleCommunityElderlyCare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CEC-001', residentName: '刘***（80 岁女性，高龄老人）', age: '80 岁', careType: '居家养老关怀（定期上门访视）', frequency: '每周 1 次（社区护士上门访视）', status: '进行中（关怀效果良好，老人生活质量稳定）' },
    { id: 'CEC-002', residentName: '张***（78 岁男性，高龄老人）', age: '78 岁', careType: '日间照料关怀（社区日间照料中心）', frequency: '每日 1 次（白天在社区日间照料中心）', status: '进行中（关怀效果良好，老人社交活动丰富）' },
    { id: 'CEC-003', residentName: '李***（82 岁女性，高龄老人）', age: '82 岁', careType: '助餐服务关怀（社区食堂送餐）', frequency: '每日 3 次（早中晚三餐送餐上门）', status: '进行中（关怀效果良好，老人饮食营养均衡）' },
    { id: 'CEC-004', residentName: '王***（76 岁男性，高龄老人）', age: '76 岁', careType: '健康管理关怀（定期体检 + 慢病管理）', frequency: '每月 1 次（社区医生定期体检）', status: '进行中（关怀效果良好，老人健康状况稳定）' },
    { id: 'CEC-005', residentName: '陈***（85 岁女性，高龄老人）', age: '85 岁', careType: '紧急救助关怀（一键呼叫 + 应急响应）', frequency: '随时（24 小时紧急呼叫响应）', status: '进行中（关怀效果良好，老人安全有保障）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/chronic-disease - 慢病管理 5 条 */
async function handleCommunityChronicDisease(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCD-001', residentName: '张***（75 岁男性，高血压患者）', disease: '高血压（3 级，很高危）', metric: '血压 130/80 mmHg（目标值：< 140/90 mmHg）', controlStatus: '控制良好（达标）', followupTime: '2026-10-20（最近随访时间）' },
    { id: 'CCD-002', residentName: '李***（70 岁女性，糖尿病患者）', disease: '糖尿病（2 型）', metric: '空腹血糖 6.5 mmol/L（目标值：< 7.0 mmol/L）', controlStatus: '控制良好（达标）', followupTime: '2026-10-20（最近随访时间）' },
    { id: 'CCD-003', residentName: '王***（65 岁男性，冠心病患者）', disease: '冠心病（支架术后）', metric: '心率 75 次/分、血压 130/80 mmHg（目标值：心率 < 80 次/分、血压 < 140/90 mmHg）', controlStatus: '控制良好（达标）', followupTime: '2026-10-20（最近随访时间）' },
    { id: 'CCD-004', residentName: '陈***（60 岁男性，慢阻肺患者）', disease: '慢阻肺（稳定期）', metric: '肺功能 FEV1 65%（目标值：> 60%）、血氧饱和度 95%（目标值：> 93%）', controlStatus: '控制良好（达标）', followupTime: '2026-10-20（最近随访时间）' },
    { id: 'CCD-005', residentName: '刘***（80 岁女性，骨质疏松患者）', disease: '骨质疏松（重度）', metric: '骨密度 T 值 -2.8（目标值：> -2.5）', controlStatus: '控制不佳（未达标，需加强治疗）', followupTime: '2026-10-20（最近随访时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/education - 健康教育 5 条 */
async function handleCommunityEducation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CE-001', activityName: '高血压防治知识讲座', topic: '高血压的预防、诊断、治疗和日常管理', participants: '50 人（社区居民参与人数）', time: '2026-10-20 14:00:00（活动时间）', location: '社区卫生服务中心会议室（杭州市***社区）' },
    { id: 'CE-002', activityName: '糖尿病饮食管理培训', topic: '糖尿病患者的饮食原则、食谱设计和营养搭配', participants: '40 人（社区居民参与人数）', time: '2026-10-20 15:00:00（活动时间）', location: '社区卫生服务中心健康教育室（杭州市***社区）' },
    { id: 'CE-003', activityName: '冠心病康复训练指导', topic: '冠心病患者的康复训练方法、注意事项和运动处方', participants: '30 人（社区居民参与人数）', time: '2026-10-20 16:00:00（活动时间）', location: '社区卫生服务中心康复训练室（杭州市***社区）' },
    { id: 'CE-004', activityName: '慢阻肺呼吸康复培训', topic: '慢阻肺患者的呼吸训练方法、排痰技巧和家庭氧疗', participants: '35 人（社区居民参与人数）', time: '2026-10-20 17:00:00（活动时间）', location: '社区卫生服务中心健康教育室（杭州市***社区）' },
    { id: 'CE-005', activityName: '老年人防跌倒健康讲座', topic: '老年人跌倒的预防、跌倒后的应急处理和康复', participants: '60 人（社区居民参与人数）', time: '2026-10-20 18:00:00（活动时间）', location: '社区活动中心大礼堂（杭州市***社区）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m371Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/community/followups', handle: handleCommunityFollowups, auth: true },
  { method: 'GET', path: '/api/v1/community/health-records', handle: handleCommunityHealthRecords, auth: true },
  { method: 'GET', path: '/api/v1/community/elderly-care', handle: handleCommunityElderlyCare, auth: true },
  { method: 'GET', path: '/api/v1/community/chronic-disease', handle: handleCommunityChronicDisease, auth: true },
  { method: 'GET', path: '/api/v1/community/education', handle: handleCommunityEducation, auth: true },
];
