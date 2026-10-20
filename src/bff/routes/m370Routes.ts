/**
 * 健澜科技 jlmedaios - M370 P1 业务扩展：远程医疗深度打磨
 *
 * 远程会诊/远程诊断/远程监护/远程手术/远程培训/远程设备
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemed/remote-consults - 远程会诊 5 条 */
async function handleTelemedRemoteConsults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRC-001', consultNo: 'CONS-2026-10-20-000001', patientName: '张***（65 岁男性，心内科疑难病例）', initiatorHospital: '本院（杭州市***医院）', expertHospital: '浙大一院（浙江大学医学院附属第一医院心内科）', time: '2026-10-20 14:00:00（远程会诊时间）' },
    { id: 'TRC-002', consultNo: 'CONS-2026-10-20-000002', patientName: '李***（55 岁女性，骨科复杂骨折）', initiatorHospital: '本院（杭州市***医院）', expertHospital: '邵逸夫医院（浙江大学医学院附属邵逸夫医院骨科）', time: '2026-10-20 15:00:00（远程会诊时间）' },
    { id: 'TRC-003', consultNo: 'CONS-2026-10-20-000003', patientName: '王***（60 岁男性，内分泌科疑难病例）', initiatorHospital: '本院（杭州市***医院）', expertHospital: '浙二医院（浙江大学医学院附属第二医院内分泌科）', time: '2026-10-20 16:00:00（远程会诊时间）' },
    { id: 'TRC-004', consultNo: 'CONS-2026-10-20-000004', patientName: '刘***（70 岁女性，呼吸内科疑难病例）', initiatorHospital: '本院（杭州市***医院）', expertHospital: '上海市肺科医院（同济大学附属上海市肺科医院呼吸科）', time: '2026-10-20 17:00:00（远程会诊时间）' },
    { id: 'TRC-005', consultNo: 'CONS-2026-10-20-000005', patientName: '陈***（45 岁男性，普外科疑难病例）', initiatorHospital: '本院（杭州市***医院）', expertHospital: '浙江省人民医院（浙江中医药大学附属浙江省人民医院普外科）', time: '2026-10-20 18:00:00（远程会诊时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-diagnosis - 远程诊断 5 条 */
async function handleTelemedRemoteDiagnosis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRD-001', diagnosisNo: 'DIAG-2026-10-20-000001', patientName: '张***（65 岁男性，心内科患者）', initiatorDepartment: '本院心内科（杭州市***医院心内科）', expertDepartment: '浙大一院心内科（浙江大学医学院附属第一医院心内科）', time: '2026-10-20 10:00:00（远程诊断时间）' },
    { id: 'TRD-002', diagnosisNo: 'DIAG-2026-10-20-000002', patientName: '李***（55 岁女性，骨科患者）', initiatorDepartment: '本院骨科（杭州市***医院骨科）', expertDepartment: '邵逸夫医院骨科（浙江大学医学院附属邵逸夫医院骨科）', time: '2026-10-20 11:00:00（远程诊断时间）' },
    { id: 'TRD-003', diagnosisNo: 'DIAG-2026-10-20-000003', patientName: '王***（60 岁男性，内分泌科患者）', initiatorDepartment: '本院内分泌科（杭州市***医院内分泌科）', expertDepartment: '浙二医院内分泌科（浙江大学医学院附属第二医院内分泌科）', time: '2026-10-20 14:00:00（远程诊断时间）' },
    { id: 'TRD-004', diagnosisNo: 'DIAG-2026-10-20-000004', patientName: '刘***（70 岁女性，呼吸内科患者）', initiatorDepartment: '本院呼吸内科（杭州市***医院呼吸内科）', expertDepartment: '上海市肺科医院呼吸科（同济大学附属上海市肺科医院呼吸科）', time: '2026-10-20 15:00:00（远程诊断时间）' },
    { id: 'TRD-005', diagnosisNo: 'DIAG-2026-10-20-000005', patientName: '陈***（45 岁男性，普外科患者）', initiatorDepartment: '本院普外科（杭州市***医院普外科）', expertDepartment: '浙江省人民医院普外科（浙江中医药大学附属浙江省人民医院普外科）', time: '2026-10-20 16:00:00（远程诊断时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-monitoring - 远程监护 5 条 */
async function handleTelemedRemoteMonitoring(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRM-001', monitoringNo: 'MON-2026-10-20-000001', patientName: '张***（65 岁男性，心内科术后患者）', device: '远程心电监护仪（型号：Philips IntelliVue MX400）', metric: '心率 75 次/分、血压 130/80 mmHg、血氧饱和度 98%', time: '2026-10-20 14:00:00（实时监护时间）' },
    { id: 'TRM-002', monitoringNo: 'MON-2026-10-20-000002', patientName: '李***（55 岁女性，骨科术后患者）', device: '远程血氧监护仪（型号：Masimo Rad-97）', metric: '血氧饱和度 96%、心率 80 次/分', time: '2026-10-20 15:00:00（实时监护时间）' },
    { id: 'TRM-003', monitoringNo: 'MON-2026-10-20-000003', patientName: '王***（60 岁男性，内分泌科糖尿病患者）', device: '远程血糖监护仪（型号：Dexcom G7）', metric: '血糖 6.5 mmol/L（空腹）、血糖 8.0 mmol/L（餐后 2 小时）', time: '2026-10-20 16:00:00（实时监护时间）' },
    { id: 'TRM-004', monitoringNo: 'MON-2026-10-20-000004', patientName: '刘***（70 岁女性，呼吸内科 COPD 患者）', device: '远程呼吸监护仪（型号：ResMed AirView）', metric: '呼吸频率 18 次/分、血氧饱和度 92%', time: '2026-10-20 17:00:00（实时监护时间）' },
    { id: 'TRM-005', monitoringNo: 'MON-2026-10-20-000005', patientName: '陈***（45 岁男性，普外科术后患者）', device: '远程心电监护仪（型号：Philips IntelliVue MX400）', metric: '心率 70 次/分、血压 120/75 mmHg、血氧饱和度 99%', time: '2026-10-20 18:00:00（实时监护时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-surgery - 远程手术 5 条 */
async function handleTelemedRemoteSurgery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRS-001', surgeryNo: 'SURG-2026-10-20-000001', patientName: '张***（65 岁男性，心内科冠脉支架植入术）', leadSurgeon: '李***（本院心内科主任医师，主刀医生）', assistantHospital: '浙大一院（浙江大学医学院附属第一医院心内科，远程指导）', time: '2026-10-20 09:00:00（远程手术时间）' },
    { id: 'TRS-002', surgeryNo: 'SURG-2026-10-20-000002', patientName: '李***（55 岁女性，骨科关节置换术）', leadSurgeon: '赵***（本院骨科主任医师，主刀医生）', assistantHospital: '邵逸夫医院（浙江大学医学院附属邵逸夫医院骨科，远程指导）', time: '2026-10-20 10:00:00（远程手术时间）' },
    { id: 'TRS-003', surgeryNo: 'SURG-2026-10-20-000003', patientName: '王***（60 岁男性，内分泌科甲状腺切除术）', leadSurgeon: '孙***（本院内分泌科副主任医师，主刀医生）', assistantHospital: '浙二医院（浙江大学医学院附属第二医院内分泌科，远程指导）', time: '2026-10-20 14:00:00（远程手术时间）' },
    { id: 'TRS-004', surgeryNo: 'SURG-2026-10-20-000004', patientName: '刘***（70 岁女性，呼吸内科肺叶切除术）', leadSurgeon: '周***（本院呼吸内科主治医师，主刀医生）', assistantHospital: '上海市肺科医院（同济大学附属上海市肺科医院呼吸科，远程指导）', time: '2026-10-20 15:00:00（远程手术时间）' },
    { id: 'TRS-005', surgeryNo: 'SURG-2026-10-20-000005', patientName: '陈***（45 岁男性，普外科腹腔镜阑尾切除术）', leadSurgeon: '吴***（本院普外科副主任医师，主刀医生）', assistantHospital: '浙江省人民医院（浙江中医药大学附属浙江省人民医院普外科，远程指导）', time: '2026-10-20 16:00:00（远程手术时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-training - 远程培训 5 条 */
async function handleTelemedRemoteTraining(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRT-001', trainingName: '心血管疾病诊疗新进展（远程学术讲座）', lecturer: '李***（浙大一院心内科主任医师）', participants: '本院心内科全体医生（20 人）+ 其他医院心内科医生（50 人）', hours: '2 学时（培训学时）', time: '2026-10-20 14:00:00（培训时间）' },
    { id: 'TRT-002', trainingName: '骨科微创技术实操培训（远程手术示教）', lecturer: '赵***（邵逸夫医院骨科主任医师）', participants: '本院骨科全体医生（15 人）+ 其他医院骨科医生（30 人）', hours: '4 学时（培训学时）', time: '2026-10-20 15:00:00（培训时间）' },
    { id: 'TRT-003', trainingName: '糖尿病规范化诊疗（远程学术讲座）', lecturer: '孙***（浙二医院内分泌科副主任医师）', participants: '本院内分泌科全体医生（10 人）+ 其他医院内分泌科医生（20 人）', hours: '2 学时（培训学时）', time: '2026-10-20 16:00:00（培训时间）' },
    { id: 'TRT-004', trainingName: '呼吸重症监护技术（远程实操培训）', lecturer: '周***（上海市肺科医院呼吸科主治医师）', participants: '本院呼吸内科全体医生（12 人）+ 其他医院呼吸内科医生（25 人）', hours: '4 学时（培训学时）', time: '2026-10-20 17:00:00（培训时间）' },
    { id: 'TRT-005', trainingName: '腹腔镜手术技巧（远程手术示教）', lecturer: '吴***（浙江省人民医院普外科副主任医师）', participants: '本院普外科全体医生（18 人）+ 其他医院普外科医生（35 人）', hours: '4 学时（培训学时）', time: '2026-10-20 18:00:00（培训时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-equipment - 远程设备 5 条 */
async function handleTelemedRemoteEquipment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TREQ-001', deviceName: '远程会诊终端（高清视频会议系统）', model: 'Polycom RealPresence Group 700', quantity: '5 台（全院配置数量）', status: '正常运行（可用率 99%）', location: '本院会议室（1 台）+ 各科室示教室（4 台）' },
    { id: 'TREQ-002', deviceName: '远程心电监护仪', model: 'Philips IntelliVue MX400', quantity: '20 台（全院配置数量）', status: '正常运行（可用率 98%）', location: '心内科病房（10 台）+ 急诊 ICU（5 台）+ 其他病房（5 台）' },
    { id: 'TREQ-003', deviceName: '远程血氧监护仪', model: 'Masimo Rad-97', quantity: '30 台（全院配置数量）', status: '正常运行（可用率 97%）', location: '骨科病房（10 台）+ 呼吸内科病房（10 台）+ 其他病房（10 台）' },
    { id: 'TREQ-004', deviceName: '远程血糖监护仪', model: 'Dexcom G7', quantity: '15 台（全院配置数量）', status: '正常运行（可用率 96%）', location: '内分泌科病房（10 台）+ 其他病房（5 台）' },
    { id: 'TREQ-005', deviceName: '远程呼吸监护仪', model: 'ResMed AirView', quantity: '10 台（全院配置数量）', status: '正常运行（可用率 95%）', location: '呼吸内科病房（8 台）+ ICU（2 台）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m370Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemed/remote-consults', handle: handleTelemedRemoteConsults, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-diagnosis', handle: handleTelemedRemoteDiagnosis, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-monitoring', handle: handleTelemedRemoteMonitoring, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-surgery', handle: handleTelemedRemoteSurgery, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-training', handle: handleTelemedRemoteTraining, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-equipment', handle: handleTelemedRemoteEquipment, auth: true },
];
