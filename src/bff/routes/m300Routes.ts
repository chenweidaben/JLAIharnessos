/**
 * 健澜科技 jlmedaios - M300 智慧服务域
 *
 * 排队统计/AI分诊/床位推荐/用药提醒/随访管理/健康档案
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/smart-service/queue-stats - 排队统计 5 条 */
async function handleQueueStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { window: '门诊挂号窗口 A1', queueCount: 12, avgWait: '8 分钟', callSpeed: '约 2 分钟/人', status: '正常' },
    { window: '门诊收费窗口 B2', queueCount: 25, avgWait: '15 分钟', callSpeed: '约 3 分钟/人', status: '繁忙' },
    { window: '检验科采血窗口 C1', queueCount: 18, avgWait: '10 分钟', callSpeed: '约 2.5 分钟/人', status: '正常' },
    { window: '药房发药窗口 D1', queueCount: 8, avgWait: '5 分钟', callSpeed: '约 1.5 分钟/人', status: '空闲' },
    { window: '影像科登记窗口 E1', queueCount: 5, avgWait: '3 分钟', callSpeed: '约 1 分钟/人', status: '空闲' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/smart-service/ai-triage - AI 分诊 5 条 */
async function handleAiTriage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AT-001', patient: '王***', chiefComplaint: '胸痛（压榨样，向左肩放射）', suggestedDept: '心血管内科（急诊）', urgency: 'I 级（立即）', confidence: '96%' },
    { id: 'AT-002', patient: '李***', chiefComplaint: '腹痛（转移性右下腹痛）', suggestedDept: '普外科（急诊）', urgency: 'II 级（10 分钟内）', confidence: '92%' },
    { id: 'AT-003', patient: '张***', chiefComplaint: '发热（38.5°C）+ 咳嗽', suggestedDept: '呼吸内科（门诊）', urgency: 'III 级（30 分钟内）', confidence: '88%' },
    { id: 'AT-004', patient: '赵***', chiefComplaint: '外伤（右小腿骨折，疑似）', suggestedDept: '骨科（急诊）', urgency: 'II 级（10 分钟内）', confidence: '94%' },
    { id: 'AT-005', patient: '孙***', chiefComplaint: '体检发现血压偏高', suggestedDept: '心血管内科（门诊）', urgency: 'IV 级（常规）', confidence: '85%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/smart-service/bed-recommend - 床位推荐 5 条 */
async function handleBedRecommend(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BR-001', patient: '王***', recommendedWard: '呼吸内科病房 3 楼', bedType: '普通病床', reason: '诊断为社区获得性肺炎，需呼吸内科住院治疗', status: '推荐中' },
    { id: 'BR-002', patient: '李***', recommendedWard: '普外科病房 5 楼', bedType: '普通病床', reason: '急性阑尾炎，拟行腹腔镜手术', status: '已确认' },
    { id: 'BR-003', patient: '张***', recommendedWard: '心血管内科 CCU', bedType: '监护病床', reason: '急性心肌梗死，需持续心电监护', status: '已确认' },
    { id: 'BR-004', patient: '赵***', recommendedWard: '骨科病房 6 楼', bedType: '普通病床', reason: '股骨颈骨折，拟行人工髋关节置换术', status: '推荐中' },
    { id: 'BR-005', patient: '孙***', recommendedWard: '消化内科病房 2 楼', bedType: '普通病床', reason: '胃溃疡伴消化道出血', status: '待评估' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/smart-service/medication-remind - 用药提醒 5 条 */
async function handleMedicationRemind(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MR-001', patient: '王***', medication: '阿司匹林肠溶片 100mg', time: '08:00', dosage: '1 片（口服）', status: '待服用' },
    { id: 'MR-002', patient: '李***', medication: '头孢克肟胶囊 200mg', time: '08:00', dosage: '1 粒（口服）', status: '已服用' },
    { id: 'MR-003', patient: '张***', medication: '胰岛素（门冬胰岛素）12U', time: '07:30（餐前）', dosage: '12 单位（皮下注射）', status: '已注射' },
    { id: 'MR-004', patient: '赵***', medication: '奥美拉唑肠溶胶囊 20mg', time: '08:00', dosage: '1 粒（口服）', status: '待服用' },
    { id: 'MR-005', patient: '孙***', medication: '硝苯地平控释片 30mg', time: '08:00', dosage: '1 片（口服）', status: '已服用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/smart-service/followup - 随访管理 5 条 */
async function handleFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FU-001', patient: '王***', type: '出院后 7 天电话随访', scheduledTime: '2026-10-21 10:00', doctor: '李***主治医师', status: '待随访' },
    { id: 'FU-002', patient: '李***', type: '术后 1 个月门诊随访', scheduledTime: '2026-11-15 09:00', doctor: '陈***副主任医师', status: '待随访' },
    { id: 'FU-003', patient: '张***', type: '糖尿病慢病随访（每月）', scheduledTime: '2026-10-25 14:00', doctor: '刘***主治医师', status: '已完成' },
    { id: 'FU-004', patient: '赵***', type: '肿瘤化疗后随访', scheduledTime: '2026-10-22 15:00', doctor: '王***主任医师', status: '待随访' },
    { id: 'FU-005', patient: '孙***', type: '产后 42 天复查', scheduledTime: '2026-11-05 09:30', doctor: '周***主治医师', status: '待随访' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/smart-service/health-records - 健康档案 5 条 */
async function handleHealthRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HR-001', patient: '王***', basicInfo: '男，58 岁，高血压 3 年', pastHistory: '2 型糖尿病 5 年', familyHistory: '父亲患冠心病', updatedAt: '2026-10-15' },
    { id: 'HR-002', patient: '李***', basicInfo: '女，45 岁，健康', pastHistory: '无重大疾病史', familyHistory: '母亲患乳腺癌', updatedAt: '2026-10-10' },
    { id: 'HR-003', patient: '张***', basicInfo: '男，65 岁，冠心病 2 年', pastHistory: '高血压 10 年，糖尿病 3 年', familyHistory: '父亲患脑梗死', updatedAt: '2026-10-12' },
    { id: 'HR-004', patient: '赵***', basicInfo: '女，35 岁，健康', pastHistory: '剖宫产史（2020 年）', familyHistory: '无特殊', updatedAt: '2026-10-08' },
    { id: 'HR-005', patient: '孙***', basicInfo: '男，70 岁，慢阻肺 8 年', pastHistory: '吸烟 40 年（已戒 5 年）', familyHistory: '父亲患慢阻肺', updatedAt: '2026-10-05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m300Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/smart-service/queue-stats', handle: handleQueueStats, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/ai-triage', handle: handleAiTriage, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/bed-recommend', handle: handleBedRecommend, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/medication-remind', handle: handleMedicationRemind, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/followup', handle: handleFollowup, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/health-records', handle: handleHealthRecords, auth: true },
];
