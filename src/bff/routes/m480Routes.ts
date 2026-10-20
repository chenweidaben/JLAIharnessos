/**
 * 健澜科技 jlmedaios - M480 P0 合规：教学管理 + 设备管理
 *
 * 教学培训 / 实习进修 / 教学考核 / 大型设备运行 / 设备使用率
 * （equipment/maintenance 汇总口径已存在，不重复建）。
 * 避开 M460 teaching/*、M459 equipment 既有、M465 设备全生命周期、M471-M479 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/education/training - 教学培训（项目名/类型·住培/专培/继教/对象/学时/状态）5 条 */
async function handleEducationTraining(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ET-001', name: '项目名：住院医师规范化培训（内科基地）', type: '类型：住培', audience: '对象：在培住培医师 42 人', hours: '学时：本月 36 学时（理论+技能）', status: '状态：进行中（年度考核 11 月）' },
    { id: 'ET-002', name: '项目名：专科医师培训（心血管介入方向）', type: '类型：专培', audience: '对象：专培医师 8 人', hours: '学时：本月 48 学时（导管室实操）', status: '状态：进行中' },
    { id: 'ET-003', name: '项目名：国家级继续医学教育项目（胸痛中心新进展）', type: '类型：继教（I 类学分）', audience: '对象：院内+基层医师 186 人', hours: '学时：6 学时（已完成线上直播）', status: '状态：已结业（学分已授予）' },
    { id: 'ET-004', name: '项目名：护理急救技能（BLS+ACLS）复训', type: '类型：岗位技能培训', audience: '对象：护理人员 120 人', hours: '学时：8 学时（分 4 批次）', status: '状态：进行中（已完成 2 批）' },
    { id: 'ET-005', name: '项目名：病历书写与病案首页规范培训', type: '类型：岗前/月度培训', audience: '对象：新入职医师+进修生 35 人', hours: '学时：4 学时', status: '状态：已完成（考核合格率 94%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/education/internship - 实习进修（科室/在院实习生数/进修生数/带教老师数）5 条 */
async function handleEducationInternship(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EI-001', dept: '口径：全院教学汇总', interns: '在院实习生：168 人（医学院校临床/护理/医技）', fellows: '进修生：42 人（基层医院来院）', preceptors: '带教老师：96 人（含主治及以上）' },
    { id: 'EI-002', dept: '科室：内科教研室', interns: '在院实习生：42 人', fellows: '进修生：12 人', preceptors: '带教老师：28 人' },
    { id: 'EI-003', dept: '科室：外科教研室', interns: '在院实习生：36 人', fellows: '进修生：10 人', preceptors: '带教老师：24 人' },
    { id: 'EI-004', dept: '科室：妇产科/儿科', interns: '在院实习生：28 人', fellows: '进修生：6 人', preceptors: '带教老师：14 人' },
    { id: 'EI-005', dept: '科室：护理部', interns: '在院实习生：50 人（护理实习）', fellows: '进修生：8 人', preceptors: '带教老师（带教护士）：30 人' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/education/assessment - 教学考核（考核项/出科考核通过率/教学查房次数/考核人数）5 条 */
async function handleEducationAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EA-001', item: '考核项：住培医师出科考核（内科轮转）', passRate: '出科考核通过率：94.0%', rounds: '教学查房次数：本月 18 次', tested: '考核人数：42 人（补考 2 人）' },
    { id: 'EA-002', item: '考核项：实习生出科考核', passRate: '出科考核通过率：91.5%', rounds: '教学查房次数：本月 12 次', tested: '考核人数：168 人' },
    { id: 'EA-003', item: '考核项：三基三严（理论+操作）季度考核', passRate: '通过率：96.2%', rounds: '教学查房次数：—（专项考核）', tested: '考核人数：全院医师+护理 520 人' },
    { id: 'EA-004', item: '考核项：专培医师年度中期考核', passRate: '通过率：100%（8 人均通过）', rounds: '教学查房次数：本月 6 次', tested: '考核人数：8 人' },
    { id: 'EA-005', item: '考核项：护理操作技能考核（注射/吸氧/心电监护）', passRate: '通过率：95.0%', rounds: '护理教学查房：本月 9 次', tested: '考核人数：120 人' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/large-device - 大型设备（设备/CT·MRI·DSA/开机率/故障率/检查人次）5 条 */
async function handleLargeDevice(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ELD-001', device: '设备：64 排 CT（1#）', uptime: '开机率：98.5%（本月运行）', fault: '故障率：1.2%（1 次球管预热故障，2h 内修复）', volume: '检查人次：本月 3,860 例' },
    { id: 'ELD-002', device: '设备：3.0T MRI（1#）', uptime: '开机率：96.8%', fault: '故障率：2.4%（梯度噪声告警，已联系工程师）', volume: '检查人次：本月 2,140 例' },
    { id: 'ELD-003', device: '设备：DSA 血管造影机（介入室）', uptime: '开机率：99.0%', fault: '故障率：0.8%（备用球管轮换）', volume: '检查/手术人次：本月 286 台' },
    { id: 'ELD-004', device: '设备：1.5T MRI（2#）', uptime: '开机率：98.0%', fault: '故障率：1.5%', volume: '检查人次：本月 1,680 例' },
    { id: 'ELD-005', device: '设备：直线加速器（放疗）', uptime: '开机率：97.5%', fault: '故障率：2.0%（MLC 校准）', volume: '治疗人次：本月 420 人次（分次放疗）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/utilization - 设备使用率（设备/本月检查人次/日均使用时长/利用率/高峰时段）5 条 */
async function handleEquipmentUtilization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EU-001', device: '设备：64 排 CT（1#）', volume: '本月检查人次：3,860 例', dailyHours: '日均使用时长：10.5 小时', utilization: '利用率：78%（可排程弹性）', peak: '高峰时段：上午 9:00-11:00' },
    { id: 'EU-002', device: '设备：3.0T MRI（1#）', volume: '本月检查人次：2,140 例', dailyHours: '日均使用时长：9.0 小时', utilization: '利用率：85%（预约偏紧，建议延长晚间）', peak: '高峰时段：上午 8:30-11:30' },
    { id: 'EU-003', device: '设备：DSA 血管造影机', volume: '本月介入：286 台', dailyHours: '日均使用时长：6.5 小时', utilization: '利用率：62%（受术者安排影响）', peak: '高峰时段：下午 13:30-16:00' },
    { id: 'EU-004', device: '设备：彩色多普勒超声（门诊）', volume: '本月检查人次：6,840 例', dailyHours: '日均使用时长：9.5 小时', utilization: '利用率：90%（高峰排队，建议增台）', peak: '高峰时段：全天，上午尤甚' },
    { id: 'EU-005', device: '设备：全自动生化分析仪（检验科）', volume: '本月测试量：18.6 万测试', dailyHours: '日均运行时长：20 小时（含夜间样本）', utilization: '利用率：83%（双班运行）', peak: '高峰时段：上午 7:30-10:00 标本高峰' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m480Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/education/training', handle: handleEducationTraining, auth: true },
  { method: 'GET', path: '/api/v1/education/internship', handle: handleEducationInternship, auth: true },
  { method: 'GET', path: '/api/v1/education/assessment', handle: handleEducationAssessment, auth: true },
  { method: 'GET', path: '/api/v1/equipment/large-device', handle: handleLargeDevice, auth: true },
  { method: 'GET', path: '/api/v1/equipment/utilization', handle: handleEquipmentUtilization, auth: true },
];
