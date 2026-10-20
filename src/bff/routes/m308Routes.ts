/**
 * 健澜科技 jlmedaios - M308 远程医疗域
 *
 * 远程视频/远程设备/远程记录/远程专家/远程转诊
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemed/video - 远程视频 5 条 */
async function handleTelemedVideo(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TV-001', consultNo: 'TM-20261020-001', patient: '王***（基层卫生院）', doctor: '李***主任医师（本院）', startTime: '2026-10-20 09:30', status: '会诊中' },
    { id: 'TV-002', consultNo: 'TM-20261020-002', patient: '张***（社区卫生服务中心）', doctor: '刘***主任医师（本院）', startTime: '2026-10-20 10:00', status: '已结束' },
    { id: 'TV-003', consultNo: 'TM-20261019-003', patient: '赵***（县级医院）', doctor: '陈***副主任医师（本院）', startTime: '2026-10-19 14:00', status: '已结束' },
    { id: 'TV-004', consultNo: 'TM-20261021-004', patient: '孙***（乡镇卫生院）', doctor: '王***主治医师（本院）', startTime: '2026-10-21 09:00', status: '待开始' },
    { id: 'TV-005', consultNo: 'TM-20261021-005', patient: '周***（社区卫生服务中心）', doctor: '张***副主任医师（本院）', startTime: '2026-10-21 10:30', status: '待开始' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/equipment - 远程设备 5 条 */
async function handleTelemedEquipment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TE-001', name: '远程会诊终端（高清视频）', model: 'Polycom RealPresence Group 310', location: '远程会诊中心 1 号室', status: '正常', lastMaintenance: '2026-09-15' },
    { id: 'TE-002', name: '远程影像诊断终端', model: 'Barco 医用显示器（双屏）', location: '远程影像中心', status: '正常', lastMaintenance: '2026-09-20' },
    { id: 'TE-003', name: '远程超声会诊终端', model: '迈瑞 M7 便携超声+视频采集', location: '超声科远程会诊室', status: '维修中', lastMaintenance: '2026-10-10' },
    { id: 'TE-004', name: '远程心电监测终端', model: '飞利浦 TC30 心电工作站', location: '心内科远程会诊室', status: '正常', lastMaintenance: '2026-09-25' },
    { id: 'TE-005', name: '远程病理诊断终端', model: '3DHistech Pannoramic 数字切片扫描仪', location: '病理科远程会诊室', status: '正常', lastMaintenance: '2026-09-30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/records - 远程记录 5 条 */
async function handleTelemedRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TR-001', consultNo: 'TM-20261019-001', patient: '王***', diagnosis: '冠心病（不稳定型心绞痛）', advice: '建议完善冠脉造影，必要时支架植入', doctor: '李***主任医师' },
    { id: 'TR-002', consultNo: 'TM-20261018-002', patient: '张***', diagnosis: '慢阻肺急性加重（II 型呼衰）', advice: '建议无创呼吸机辅助通气+抗感染治疗', doctor: '刘***主任医师' },
    { id: 'TR-003', consultNo: 'TM-20261017-003', patient: '赵***', diagnosis: '脑出血（基底节区，约 30ml）', advice: '建议保守治疗，密切观察，必要时转院手术', doctor: '神经外科 王***副主任医师' },
    { id: 'TR-004', consultNo: 'TM-20261016-004', patient: '孙***', diagnosis: '2 型糖尿病（血糖控制不佳）', advice: '建议调整降糖方案，加用二甲双胍缓释片', doctor: '内分泌科 陈***主治医师' },
    { id: 'TR-005', consultNo: 'TM-20261015-005', patient: '周***', diagnosis: '肺部占位（周围型肺癌可能）', advice: '建议完善胸部增强 CT+穿刺活检明确病理', doctor: '胸外科 张***主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/specialists - 远程专家 5 条 */
async function handleTelemedSpecialists(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TS-001', name: '李***', dept: '心血管内科', title: '主任医师/教授', hospital: '健澜科技附属医院', specialty: '冠心病介入治疗、心律失常射频消融' },
    { id: 'TS-002', name: '刘***', dept: '呼吸内科', title: '主任医师/教授', hospital: '健澜科技附属医院', specialty: '慢阻肺、哮喘、肺部感染性疾病' },
    { id: 'TS-003', name: '陈***', dept: '普外科', title: '副主任医师/副教授', hospital: '健澜科技附属医院', specialty: '胃肠肿瘤微创治疗、甲状腺手术' },
    { id: 'TS-004', name: '王***', dept: '神经外科', title: '副主任医师/副教授', hospital: '健澜科技附属医院', specialty: '颅脑损伤、脑出血、脑肿瘤手术' },
    { id: 'TS-005', name: '张***', dept: '胸外科', title: '主任医师/教授', hospital: '健澜科技附属医院', specialty: '肺癌、食管癌微创治疗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/referrals - 远程转诊 5 条 */
async function handleTelemedReferrals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRE-001', patient: '王***', fromDept: '基层卫生院（内科）', toDept: '本院心血管内科', reason: '冠心病需冠脉造影评估', status: '已接收' },
    { id: 'TRE-002', patient: '张***', fromDept: '社区卫生服务中心（全科）', toDept: '本院呼吸内科', reason: '慢阻肺急性加重需住院治疗', status: '已接收' },
    { id: 'TRE-003', patient: '赵***', fromDept: '县级医院（神经内科）', toDept: '本院神经外科', reason: '脑出血量大需手术评估', status: '转诊中' },
    { id: 'TRE-004', patient: '孙***', fromDept: '乡镇卫生院（内科）', toDept: '本院内分泌科', reason: '糖尿病并发症需系统治疗', status: '待接收' },
    { id: 'TRE-005', patient: '周***', fromDept: '社区卫生服务中心（全科）', toDept: '本院胸外科', reason: '肺部占位需进一步诊治', status: '已接收' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m308Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemed/video', handle: handleTelemedVideo, auth: true },
  { method: 'GET', path: '/api/v1/telemed/equipment', handle: handleTelemedEquipment, auth: true },
  { method: 'GET', path: '/api/v1/telemed/records', handle: handleTelemedRecords, auth: true },
  { method: 'GET', path: '/api/v1/telemed/specialists', handle: handleTelemedSpecialists, auth: true },
  { method: 'GET', path: '/api/v1/telemed/referrals', handle: handleTelemedReferrals, auth: true },
];
