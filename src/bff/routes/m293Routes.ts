/**
 * 健澜科技 jlmedaios - M293 业务域补充
 *
 * 会诊列表/急诊列表/ICU 列表/麻醉列表/出院列表
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/consultation/list - 会诊列表 5 条 */
async function handleConsultationList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CS-001', patient: '王***', applyDept: '呼吸内科', expert: '李***（ICU 主任）', reason: '重症肺炎会诊', status: '已完成', date: '2026-10-20' },
    { id: 'CS-002', patient: '李***', applyDept: '普外科', expert: '陈***（心内科主任）', reason: '术前心功能评估', status: '待会诊', date: '2026-10-21' },
    { id: 'CS-003', patient: '张***', applyDept: '消化内科', expert: '刘***（肿瘤科副主任）', reason: '消化道肿瘤鉴别诊断', status: '已完成', date: '2026-10-19' },
    { id: 'CS-004', patient: '赵***', applyDept: '神经内科', expert: '王***（影像科主任）', reason: '头颅 MRI 影像会诊', status: '已完成', date: '2026-10-18' },
    { id: 'CS-005', patient: '孙***', applyDept: '骨科', expert: '周***（内分泌科主治）', reason: '糖尿病围手术期管理', status: '待会诊', date: '2026-10-22' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/list - 急诊列表 5 条 */
async function handleEmergencyList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', patient: '钱***', triageLevel: 'I 级（危）', doctor: '郑***主治医师', status: '抢救中', arrivalTime: '2026-10-20 22:15' },
    { id: 'ER-002', patient: '冯***', triageLevel: 'II 级（重）', doctor: '吴***住院医师', status: '观察中', arrivalTime: '2026-10-20 22:30' },
    { id: 'ER-003', patient: '褚***', triageLevel: 'III 级（急）', doctor: '王***主治医师', status: '已接诊', arrivalTime: '2026-10-20 22:45' },
    { id: 'ER-004', patient: '卫***', triageLevel: 'III 级（急）', doctor: '李***住院医师', status: '候诊中', arrivalTime: '2026-10-20 23:00' },
    { id: 'ER-005', patient: '蒋***', triageLevel: 'IV 级（亚急）', doctor: '郑***主治医师', status: '已处理离院', arrivalTime: '2026-10-20 21:30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/list - ICU 列表 5 条 */
async function handleIcuList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ICU-001', bed: 'ICU-01', patient: '钱***', condition: '重症肺炎（ARDS）', doctor: '李***主任', admissionTime: '2026-10-19 14:00' },
    { id: 'ICU-002', bed: 'ICU-02', patient: '冯***', condition: '急性心肌梗死（术后）', doctor: '陈***副主任', admissionTime: '2026-10-20 08:30' },
    { id: 'ICU-003', bed: 'ICU-03', patient: '褚***', condition: '颅脑外伤（术后）', doctor: '刘***主治', admissionTime: '2026-10-18 20:00' },
    { id: 'ICU-004', bed: 'ICU-04', patient: '卫***', condition: '感染性休克', doctor: '李***主任', admissionTime: '2026-10-20 10:00' },
    { id: 'ICU-005', bed: 'ICU-05', patient: '蒋***', condition: '慢阻肺急性加重', doctor: '王***主治', admissionTime: '2026-10-17 09:00' },
  ];
  return json(ok({ items, totalCount: items.length, occupancy: 5 }));
}

/** GET /api/v1/anesthesia/list - 麻醉列表 5 条 */
async function handleAnesthesiaList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AN-001', patient: '王***', surgery: '腹腔镜胆囊切除术', anesthesiologist: '郑***主治医师', status: '已完成', date: '2026-10-20 08:30' },
    { id: 'AN-002', patient: '李***', surgery: '人工髋关节置换术', anesthesiologist: '吴***副主任医师', status: '已完成', date: '2026-10-20 14:00' },
    { id: 'AN-003', patient: '张***', surgery: '冠脉支架植入术', anesthesiologist: '郑***主治医师', status: '待执行', date: '2026-10-21 09:00' },
    { id: 'AN-004', patient: '赵***', surgery: '甲状腺次全切除术', anesthesiologist: '王***住院医师', status: '待执行', date: '2026-10-21 10:00' },
    { id: 'AN-005', patient: '孙***', surgery: '阑尾切除术', anesthesiologist: '吴***副主任医师', status: '已完成', date: '2026-10-20 13:30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/discharge/list - 出院列表 5 条 */
async function handleDischargeList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DC-001', patient: '王***', dept: '呼吸内科', dischargeDate: '2026-10-20', status: '已出院', diagnosis: '社区获得性肺炎' },
    { id: 'DC-002', patient: '李***', dept: '普外科', dischargeDate: '2026-10-19', status: '已出院', diagnosis: '急性阑尾炎（术后）' },
    { id: 'DC-003', patient: '张***', dept: '心血管内科', dischargeDate: '2026-10-18', status: '已出院', diagnosis: '冠心病' },
    { id: 'DC-004', patient: '赵***', dept: '骨科', dischargeDate: '2026-10-21', status: '待出院', diagnosis: '股骨颈骨折（术后）' },
    { id: 'DC-005', patient: '孙***', dept: '消化内科', dischargeDate: '2026-10-17', status: '已出院', diagnosis: '胃溃疡' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m293Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/consultation/list', handle: handleConsultationList, auth: true },
  { method: 'GET', path: '/api/v1/emergency/list', handle: handleEmergencyList, auth: true },
  { method: 'GET', path: '/api/v1/icu/list', handle: handleIcuList, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/list', handle: handleAnesthesiaList, auth: true },
  { method: 'GET', path: '/api/v1/discharge/list', handle: handleDischargeList, auth: true },
];
