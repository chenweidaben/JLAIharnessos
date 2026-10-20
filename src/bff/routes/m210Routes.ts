/**
 * 健澜科技 jlmedaios - M210 门诊预约 + 入出院转科 + 手术排程核心流程
 *
 * 预约挂号/候诊队列/医生排班 + 入院登记/转科记录/出院登记 + 手术排程/手术室状态
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、门诊预约挂号 ==================== */

/** GET /api/v1/outpatient/appointments - 预约挂号列表 */
async function handleOutpatientAppointments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const appointments = [
    { id: 'APT-001', patient: '张演示', dept: '心内科', doctor: '李医生', timeSlot: '上午 8:00-10:00', status: '已签到', appointmentType: '专家号' },
    { id: 'APT-002', patient: '李患者', dept: '呼吸科', doctor: '王医生', timeSlot: '上午 10:00-12:00', status: '已预约', appointmentType: '普通号' },
    { id: 'APT-003', patient: '王先生', dept: '消化科', doctor: '张主任', timeSlot: '下午 14:00-16:00', status: '已就诊', appointmentType: '特需号' },
    { id: 'APT-004', patient: '赵女士', dept: '内分泌科', doctor: '陈医生', timeSlot: '下午 16:00-17:00', status: '已预约', appointmentType: '普通号' },
    { id: 'APT-005', patient: '刘大爷', dept: '神经内科', doctor: '刘主任', timeSlot: '上午 8:00-10:00', status: '已取消', appointmentType: '专家号' },
  ];

  return json(ok({ appointments, totalCount: appointments.length }));
}

/** GET /api/v1/outpatient/queue - 候诊队列 */
async function handleOutpatientQueue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const queue = {
    dept: '心内科',
    currentNumber: 'A008',
    waitingList: [
      { number: 'A009', name: '孙患者', status: '候诊中' },
      { number: 'A010', name: '周患者', status: '候诊中' },
      { number: 'A011', name: '吴患者', status: '候诊中' },
      { number: 'A012', name: '郑患者', status: '已签到' },
    ],
    waitingCount: 4,
  };

  return json(ok(queue));
}

/** GET /api/v1/outpatient/schedule - 医生出诊排班 */
async function handleOutpatientSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const schedules = [
    { id: 'SCH-001', doctor: '李医生', dept: '心内科', dayOfWeek: '周一', timeSlot: '上午', totalSlots: 20, bookedSlots: 15 },
    { id: 'SCH-002', doctor: '李主任', dept: '心内科', dayOfWeek: '周二', timeSlot: '上午', totalSlots: 15, bookedSlots: 12 },
    { id: 'SCH-003', doctor: '王医生', dept: '呼吸科', dayOfWeek: '周三', timeSlot: '下午', totalSlots: 30, bookedSlots: 20 },
    { id: 'SCH-004', doctor: '张主任', dept: '消化科', dayOfWeek: '周四', timeSlot: '上午', totalSlots: 10, bookedSlots: 8 },
    { id: 'SCH-005', doctor: '陈医生', dept: '内分泌科', dayOfWeek: '周五', timeSlot: '下午', totalSlots: 25, bookedSlots: 18 },
  ];

  return json(ok({ schedules, totalCount: schedules.length }));
}

/* ==================== 二、入出院转科 ==================== */

/** GET /api/v1/inpatient/admissions - 入院登记 */
async function handleInpatientAdmissions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const admissions = [
    { id: 'ADM-001', patient: '张演示', dept: '心内科', bedNo: '101-3', diagnosis: '冠心病（不稳定型心绞痛）', status: '已入院' },
    { id: 'ADM-002', patient: '李患者', dept: '呼吸科', bedNo: '202-1', diagnosis: '肺炎', status: '已入院' },
    { id: 'ADM-003', patient: '王先生', dept: '消化科', bedNo: '303-5', diagnosis: '消化性溃疡', status: '待入院' },
    { id: 'ADM-004', patient: '赵女士', dept: '内分泌科', bedNo: '404-2', diagnosis: '2型糖尿病', status: '已入院' },
    { id: 'ADM-005', patient: '刘大爷', dept: '神经内科', bedNo: '505-4', diagnosis: '脑梗死', status: '已出院' },
  ];

  return json(ok({ admissions, totalCount: admissions.length }));
}

/** GET /api/v1/inpatient/transfers - 转科记录 */
async function handleInpatientTransfers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const transfers = [
    { id: 'TRF-001', patient: '张演示', fromDept: '急诊科', toDept: '心内科', transferTime: '2026-10-15 11:00', reason: '急诊留观后转入心内科进一步治疗' },
    { id: 'TRF-002', patient: '李患者', fromDept: '呼吸科', toDept: 'ICU', transferTime: '2026-10-16 08:30', reason: '病情恶化转入ICU监护' },
    { id: 'TRF-003', patient: '王先生', fromDept: '消化科', toDept: '普外科', transferTime: '2026-10-18 14:00', reason: '需手术治疗转入普外科' },
  ];

  return json(ok({ transfers, totalCount: transfers.length }));
}

/** GET /api/v1/inpatient/discharges - 出院登记 */
async function handleInpatientDischarges(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const discharges = [
    { id: 'DIS-001', patient: '刘大爷', dept: '神经内科', diagnosis: '脑梗死（恢复期）', dischargeType: '常规出院', dischargeTime: '2026-10-18 10:00' },
    { id: 'DIS-002', patient: '陈患者', dept: '骨科', diagnosis: '股骨颈骨折术后', dischargeType: '常规出院', dischargeTime: '2026-10-17 14:00' },
    { id: 'DIS-003', patient: '赵患者', dept: '心内科', diagnosis: '急性心肌梗死', dischargeType: '转院', dischargeTime: '2026-10-16 09:00' },
    { id: 'DIS-004', patient: '孙患者', dept: '普外科', diagnosis: '急性阑尾炎术后', dischargeType: '常规出院', dischargeTime: '2026-10-15 16:00' },
    { id: 'DIS-005', patient: '周患者', dept: '肿瘤科', diagnosis: '晚期胃癌', dischargeType: '死亡', dischargeTime: '2026-10-14 08:30' },
  ];

  return json(ok({ discharges, totalCount: discharges.length }));
}

/* ==================== 三、手术排程 ==================== */

/** GET /api/v1/surgery/schedule - 手术排程表 */
async function handleSurgerySchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const schedule = [
    { id: 'SUR-001', date: '2026-10-20', roomNo: '1号手术室', patient: '张演示', surgeryName: '冠状动脉支架植入术', surgeon: '李主任', anesthesia: '局部麻醉', status: '进行中' },
    { id: 'SUR-002', date: '2026-10-20', roomNo: '2号手术室', patient: '李患者', surgeryName: '腹腔镜胆囊切除术', surgeon: '王主任', anesthesia: '全身麻醉', status: '已排' },
    { id: 'SUR-003', date: '2026-10-20', roomNo: '3号手术室', patient: '王先生', surgeryName: '阑尾切除术', surgeon: '张医生', anesthesia: '椎管内麻醉', status: '已排' },
    { id: 'SUR-004', date: '2026-10-21', roomNo: '1号手术室', patient: '赵患者', surgeryName: '膝关节置换术', surgeon: '刘主任', anesthesia: '全身麻醉', status: '待排' },
    { id: 'SUR-005', date: '2026-10-21', roomNo: '4号手术室', patient: '刘患者', surgeryName: '剖宫产术', surgeon: '陈主任', anesthesia: '椎管内麻醉', status: '待排' },
  ];

  return json(ok({ schedule, totalCount: schedule.length }));
}

/** GET /api/v1/surgery/rooms - 手术室状态 */
async function handleSurgeryRooms(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rooms = [
    { roomNo: '1号手术室', todayCount: 3, currentSurgery: '冠状动脉支架植入术（张演示）', status: '进行中', estimatedFreeTime: '2026-10-20 12:00' },
    { roomNo: '2号手术室', todayCount: 2, currentSurgery: '腹腔镜胆囊切除术（李患者）', status: '进行中', estimatedFreeTime: '2026-10-20 11:30' },
    { roomNo: '3号手术室', todayCount: 1, currentSurgery: '阑尾切除术（王先生）', status: '进行中', estimatedFreeTime: '2026-10-20 10:30' },
    { roomNo: '4号手术室', todayCount: 0, currentSurgery: null, status: '空闲', estimatedFreeTime: null },
    { roomNo: '5号手术室', todayCount: 0, currentSurgery: null, status: '空闲', estimatedFreeTime: null },
  ];

  return json(ok({ rooms, totalCount: rooms.length }));
}

export const m210Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/outpatient/appointments', handle: handleOutpatientAppointments, auth: true },
  // 冲突修复：/outpatient/queue 由 routes/outpatient.ts 主路由提供（返回含 encounterId 的数组），此处重复的对象式 mock 会遮蔽主路由导致前端 queue.forEach 崩溃，故停用
  { method: 'GET', path: '/api/v1/outpatient/schedule', handle: handleOutpatientSchedule, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/admissions', handle: handleInpatientAdmissions, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/transfers', handle: handleInpatientTransfers, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/discharges', handle: handleInpatientDischarges, auth: true },
  { method: 'GET', path: '/api/v1/surgery/schedule', handle: handleSurgerySchedule, auth: true },
  { method: 'GET', path: '/api/v1/surgery/rooms', handle: handleSurgeryRooms, auth: true },
];
