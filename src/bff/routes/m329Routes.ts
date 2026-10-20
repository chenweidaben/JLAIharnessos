/**
 * 健澜科技 jlmedaios - M329 远程医疗 + 社区医疗域
 *
 * 远程会诊/诊疗记录/远程设备 + 社区随访（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemedicine/consultations - 远程会诊 5 条 */
async function handleTelemedicineConsultations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TC-001', consultNo: 'CON-2026-000001', patient: '张***（男，65 岁，冠心病术后复查）', doctor: '李***（心内科主任医师，省级三甲医院）', startTime: '2026-10-20 10:00:00（已结束 30 分钟）', status: '已完成' },
    { id: 'TC-002', consultNo: 'CON-2026-000002', patient: '王***（女，58 岁，糖尿病并发症评估）', doctor: '陈***（内分泌科副主任医师，省级三甲医院）', startTime: '2026-10-20 14:00:00（进行中）', status: '进行中' },
    { id: 'TC-003', consultNo: 'CON-2026-000003', patient: '刘***（男，72 岁，脑卒中后康复评估）', doctor: '赵***（神经内科主任医师，省级三甲医院）', startTime: '2026-10-21 09:00:00（待开始）', status: '待开始' },
    { id: 'TC-004', consultNo: 'CON-2026-000004', patient: '孙***（女，45 岁，甲状腺结节性质判定）', doctor: '周***（普外科副主任医师，省级三甲医院）', startTime: '2026-10-21 10:30:00（待开始）', status: '待开始' },
    { id: 'TC-005', consultNo: 'CON-2026-000005', patient: '吴***（男，60 岁，慢阻肺急性加重治疗方案）', doctor: '郑***（呼吸内科主任医师，省级三甲医院）', startTime: '2026-10-19 15:00:00（已结束 45 分钟）', status: '已完成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemedicine/records - 远程诊疗记录 5 条 */
async function handleTelemedicineRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TR-001', consultNo: 'CON-2026-000001', patient: '张***（男，65 岁）', diagnosis: '冠心病 PCI 术后 3 个月，恢复良好', suggestion: '继续规律服用阿司匹林+他汀类药物，每月复查心电图+血脂，3 个月后复查冠脉造影', doctor: '李***（心内科主任医师）' },
    { id: 'TR-002', consultNo: 'CON-2026-000002', patient: '王***（女，58 岁）', diagnosis: '2 型糖尿病合并糖尿病肾病（III 期）', suggestion: '调整降糖方案（改为胰岛素治疗），严格控制血压（<130/80mmHg），每 3 个月复查肾功能+尿微量白蛋白', doctor: '陈***（内分泌科副主任医师）' },
    { id: 'TR-003', consultNo: 'CON-2026-000005', patient: '吴***（男，60 岁）', diagnosis: '慢阻肺急性加重（合并肺部感染）', suggestion: '静脉使用抗生素（头孢类）+ 雾化吸入（布地奈德+沙丁胺醇），持续低流量吸氧，7-10 天后复查胸部 CT', doctor: '郑***（呼吸内科主任医师）' },
    { id: 'TR-004', consultNo: 'CON-2026-000004', patient: '孙***（女，45 岁）', diagnosis: '甲状腺结节（TI-RADS 4a 级，倾向良性）', suggestion: '3 个月后复查甲状腺超声+甲状腺功能，如结节增大或分级升高，建议穿刺活检', doctor: '周***（普外科副主任医师）' },
    { id: 'TR-005', consultNo: 'CON-2026-000003', patient: '刘***（男，72 岁）', diagnosis: '脑卒中后偏瘫（Brunnstrom III 期）', suggestion: '继续康复训练（PT+OT），配合针灸治疗，目标 6 个月后恢复至 Brunnstrom IV 期', doctor: '赵***（神经内科主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemedicine/devices - 远程设备 5 条 */
async function handleTelemedicineDevices(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TD-001', deviceName: '远程会诊一体机（高清视频）', model: 'JL-THD-2000（健澜科技自研）', location: '远程会诊中心 1 号室（院内）', status: '正常使用', maintenanceTime: '2026-09-15（定期维护）' },
    { id: 'TD-002', deviceName: '远程会诊一体机（高清视频）', model: 'JL-THD-2000（健澜科技自研）', location: '远程会诊中心 2 号室（院内）', status: '正常使用', maintenanceTime: '2026-09-15（定期维护）' },
    { id: 'TD-003', deviceName: '远程心电采集终端', model: 'JL-ECG-12（健澜科技自研）', location: '心内科门诊（院内）+ 社区卫生服务中心（3 台）', status: '正常使用', maintenanceTime: '2026-10-01（定期维护）' },
    { id: 'TD-004', deviceName: '远程超声诊断系统', model: 'JL-US-500（健澜科技自研）', location: '超声科（院内）+ 基层医院（2 台）', status: '正常使用', maintenanceTime: '2026-08-20（定期维护）' },
    { id: 'TD-005', deviceName: '远程血压/血糖监测仪（便携式）', model: 'JL-BGM-100（健澜科技自研）', location: '社区卫生服务中心（10 台，可租借给患者居家使用）', status: '正常使用（8 台在院，2 台已租借）', maintenanceTime: '2026-10-10（定期维护）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/visits - 社区随访 5 条 */
async function handleCommunityVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CV-001', resident: '张***（男，65 岁，高血压患者）', visitDoctor: '李***（社区卫生服务中心全科医生）', visitTime: '2026-10-20 09:00:00', content: '测量血压（135/85mmHg，控制良好）+ 询问服药依从性（规律服药）+ 生活方式指导（低盐饮食）', status: '已完成' },
    { id: 'CV-002', resident: '王***（女，58 岁，糖尿病患者）', visitDoctor: '陈***（社区卫生服务中心全科医生）', visitTime: '2026-10-20 10:00:00', content: '测量空腹血糖（7.2mmol/L，略偏高）+ 调整饮食建议（控制主食量）+ 预约下次复查（1 周后）', status: '已完成' },
    { id: 'CV-003', resident: '刘***（男，72 岁，脑卒中后康复患者）', visitDoctor: '赵***（社区卫生服务中心康复治疗师）', visitTime: '2026-10-20 14:00:00', content: '评估康复进展（Brunnstrom III 期，较上月提升半级）+ 指导居家康复训练（PT+OT 动作）+ 预约下次上门（2 周后）', status: '已完成' },
    { id: 'CV-004', resident: '孙***（女，45 岁，甲状腺结节随访）', visitDoctor: '周***（社区卫生服务中心全科医生）', visitTime: '2026-10-21 09:00:00', content: '预约上级医院复查甲状腺超声（3 个月后）+ 记录患者症状（无不适）+ 心理疏导（缓解焦虑）', status: '待进行' },
    { id: 'CV-005', resident: '吴***（男，60 岁，慢阻肺患者）', visitDoctor: '郑***（社区卫生服务中心全科医生）', visitTime: '2026-10-21 10:00:00', content: '评估肺功能（FEV1 占预计值 65%，较上月无变化）+ 指导吸入剂正确使用方法 + 提醒戒烟（仍在吸烟）', status: '待进行' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m329Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemedicine/consultations', handle: handleTelemedicineConsultations, auth: true },
  { method: 'GET', path: '/api/v1/telemedicine/records', handle: handleTelemedicineRecords, auth: true },
  { method: 'GET', path: '/api/v1/telemedicine/devices', handle: handleTelemedicineDevices, auth: true },
  { method: 'GET', path: '/api/v1/community/visits', handle: handleCommunityVisits, auth: true },
];
