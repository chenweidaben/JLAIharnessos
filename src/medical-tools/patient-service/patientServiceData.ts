/**
 * 健澜科技数智医院智能体 - 患者服务Mock数据
 *
 * 提供号源、就诊提醒、随访计划等模拟数据，供患者服务类工具使用。
 * 所有数据均为虚构，仅供开发与测试。
 *
 * 设计说明：所有与"今天"相关的业务日期（号源排班、预约日期、随访日期）
 * 一律通过 mockDate/mockDateTime 相对当前日期动态生成，禁止硬编码绝对日期，
 * 否则随着时间推移会出现"预约已过期/号源已失效"导致测试与演示随时间崩坏
 * （工业级软件中的 time-bomb 反模式）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 相对日期工具（本地时区，避免 UTC 跨日偏移）
// ============================================================================

/**
 * 生成相对今天偏移 offsetDays 天的日期字符串（YYYY-MM-DD，本地时区）。
 *
 * @param offsetDays - 偏移天数，正数为未来，负数为过去，0 为今天
 * @returns YYYY-MM-DD 格式日期
 */
export function mockDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 生成相对今天偏移 offsetDays 天、指定时分的本地日期时间 ISO 字符串。
 *
 * @param offsetDays - 偏移天数，正数为未来，负数为过去
 * @param hour - 小时（0-23），默认 9
 * @param minute - 分钟（0-59），默认 0
 * @returns ISO 8601 本地日期时间字符串
 */
export function mockDateTime(offsetDays: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ============================================================================
// 科室与医生排班（号源）
// ============================================================================

/** 医生号源 */
export interface MockDoctorSlot {
  doctorId: string;
  doctorName: string;
  department: string;
  title: string;
  date: string; // YYYY-MM-DD
  timeSlots: {
    slotId: string;
    timeRange: string;
    totalQuota: number;
    booked: number;
  }[];
}

/** 可用科室 */
export const MOCK_DEPARTMENTS = [
  '心血管内科',
  '呼吸内科',
  '消化内科',
  '内分泌科',
  '神经内科',
  '妇产科',
  '骨科',
  '普通外科',
  '儿科',
] as const;

/**
 * 医生排班号源（相对今天动态滚动）。
 *
 * 布局约定（被预约挂号测试依赖，修改需同步测试）：
 * - D0001 王主任 心血管内科：今天排班，AM1 有余号 / AM2 约满 / PM1 余号充足
 * - D0002 陈医生 呼吸内科：今天排班，AM1 约满（用于 SLOT_FULL 场景）
 * - D0003 刘医生 消化内科：明天排班，PM1 约满
 */
export const MOCK_DOCTOR_SLOTS: MockDoctorSlot[] = [
  {
    doctorId: 'D0001',
    doctorName: '王主任',
    department: '心血管内科',
    title: '主任医师',
    date: mockDate(0),
    timeSlots: [
      { slotId: 'AM1', timeRange: '08:00-09:00', totalQuota: 20, booked: 18 },
      { slotId: 'AM2', timeRange: '09:00-10:00', totalQuota: 20, booked: 20 },
      { slotId: 'PM1', timeRange: '14:00-15:00', totalQuota: 20, booked: 5 },
    ],
  },
  {
    doctorId: 'D0002',
    doctorName: '陈医生',
    department: '呼吸内科',
    title: '副主任医师',
    date: mockDate(0),
    timeSlots: [
      { slotId: 'AM1', timeRange: '08:00-09:00', totalQuota: 15, booked: 15 },
      { slotId: 'AM2', timeRange: '09:00-10:00', totalQuota: 15, booked: 9 },
    ],
  },
  {
    doctorId: 'D0003',
    doctorName: '刘医生',
    department: '消化内科',
    title: '主治医师',
    date: mockDate(1),
    timeSlots: [
      { slotId: 'AM1', timeRange: '08:00-09:00', totalQuota: 30, booked: 12 },
      { slotId: 'PM1', timeRange: '14:00-15:00', totalQuota: 30, booked: 30 },
    ],
  },
];

// ============================================================================
// 预约记录
// ============================================================================

/** 预约挂号记录 */
export interface MockAppointment {
  appointmentId: string;
  patientId: string;
  department: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  visitType: string;
  status: '已预约' | '已到诊' | '已取消' | '已过号';
  createdAt: string;
}

/**
 * 已有预约记录（相对今天动态滚动）。
 *
 * 布局约定（被就诊提醒测试依赖，修改需同步测试）：
 * - P2026090001：3 天后的心血管内科复诊（落在 daysAhead=30 窗口内，状态已预约）
 * - P2026090003：明天的消化内科复诊
 */
export const APPOINTMENT_STORE: MockAppointment[] = [
  {
    appointmentId: 'AP20260915001',
    patientId: 'P2026090001',
    department: '心血管内科',
    doctorId: 'D0001',
    doctorName: '王主任',
    date: mockDate(3),
    timeSlot: '14:00-15:00',
    visitType: '复诊',
    status: '已预约',
    createdAt: mockDateTime(-3, 9),
  },
  {
    appointmentId: 'AP20260914002',
    patientId: 'P2026090003',
    department: '消化内科',
    doctorId: 'D0003',
    doctorName: '刘医生',
    date: mockDate(1),
    timeSlot: '08:00-09:00',
    visitType: '复诊',
    status: '已预约',
    createdAt: mockDateTime(-4, 16, 30),
  },
];

// ============================================================================
// 随访计划
// ============================================================================

/** 随访计划记录 */
export interface MockFollowUp {
  followUpId: string;
  patientId: string;
  followUpType: '慢病随访' | '术后随访' | '出院随访' | '用药随访' | '专科随访';
  plan: string;
  nextFollowUpDate: string;
  status: '待随访' | '进行中' | '已完成' | '已逾期' | '已取消';
  responsible: string;
  createdAt: string;
  lastContactAt: string | null;
  remark: string | null;
}

/**
 * 随访计划（相对今天动态滚动）。
 *
 * 布局约定（被随访/就诊提醒测试依赖，修改需同步测试）：
 * - P2026090001：12 天后慢病随访（待随访，落在 daysAhead=30 窗口内）
 * - P2026090002：5 天后出院随访（进行中）
 * - P2026090004：3 天前用药随访（已逾期，用于"逾期随访"场景）
 */
export const FOLLOW_UP_STORE: MockFollowUp[] = [
  {
    followUpId: 'FU20260901001',
    patientId: 'P2026090001',
    followUpType: '慢病随访',
    plan: '冠心病PCI术后双联抗血小板治疗随访，监测出血征象、血压、血脂，评估服药依从性',
    nextFollowUpDate: mockDate(12),
    status: '待随访',
    responsible: '心血管内科-王主任',
    createdAt: mockDateTime(-18, 10),
    lastContactAt: null,
    remark: '植入支架1枚，建议12个月内坚持DAPT',
  },
  {
    followUpId: 'FU20260910002',
    patientId: 'P2026090002',
    followUpType: '出院随访',
    plan: '肺炎治疗后复查血常规、CRP及胸部影像，评估COPD稳定期用药调整',
    nextFollowUpDate: mockDate(5),
    status: '进行中',
    responsible: '呼吸内科-陈医生',
    createdAt: mockDateTime(-9, 15),
    lastContactAt: mockDateTime(-6, 9),
    remark: '嘱戒烟、规律吸入支气管扩张剂',
  },
  {
    followUpId: 'FU20260815003',
    patientId: 'P2026090004',
    followUpType: '用药随访',
    plan: '甲状腺功能亢进用药随访，复查甲功（TSH/FT3/FT4），调整甲巯咪唑剂量',
    nextFollowUpDate: mockDate(-3),
    status: '已逾期',
    responsible: '内分泌科-孙主任',
    createdAt: mockDateTime(-35, 11),
    lastContactAt: mockDateTime(-35, 11),
    remark: null,
  },
];
