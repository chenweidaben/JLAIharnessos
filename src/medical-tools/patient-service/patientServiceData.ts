/**
 * 健澜科技数智医院智能体 - 患者服务Mock数据
 *
 * 提供号源、就诊提醒、随访计划等模拟数据，供患者服务类工具使用。
 * 所有数据均为虚构，仅供开发与测试。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

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

/** 医生排班号源（本周） */
export const MOCK_DOCTOR_SLOTS: MockDoctorSlot[] = [
  {
    doctorId: 'D0001',
    doctorName: '王主任',
    department: '心血管内科',
    title: '主任医师',
    date: '2026-09-18',
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
    date: '2026-09-18',
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
    date: '2026-09-19',
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

export const APPOINTMENT_STORE: MockAppointment[] = [
  {
    appointmentId: 'AP20260915001',
    patientId: 'P2026090001',
    department: '心血管内科',
    doctorId: 'D0001',
    doctorName: '王主任',
    date: '2026-09-18',
    timeSlot: '14:00-15:00',
    visitType: '复诊',
    status: '已预约',
    createdAt: '2026-09-15T09:00:00',
  },
  {
    appointmentId: 'AP20260914002',
    patientId: 'P2026090003',
    department: '消化内科',
    doctorId: 'D0003',
    doctorName: '刘医生',
    date: '2026-09-19',
    timeSlot: '08:00-09:00',
    visitType: '复诊',
    status: '已预约',
    createdAt: '2026-09-14T16:30:00',
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

export const FOLLOW_UP_STORE: MockFollowUp[] = [
  {
    followUpId: 'FU20260901001',
    patientId: 'P2026090001',
    followUpType: '慢病随访',
    plan: '冠心病PCI术后双联抗血小板治疗随访，监测出血征象、血压、血脂，评估服药依从性',
    nextFollowUpDate: '2026-10-01',
    status: '待随访',
    responsible: '心血管内科-王主任',
    createdAt: '2026-09-01T10:00:00',
    lastContactAt: null,
    remark: '植入支架1枚，建议12个月内坚持DAPT',
  },
  {
    followUpId: 'FU20260910002',
    patientId: 'P2026090002',
    followUpType: '出院随访',
    plan: '肺炎治疗后复查血常规、CRP及胸部影像，评估COPD稳定期用药调整',
    nextFollowUpDate: '2026-09-24',
    status: '进行中',
    responsible: '呼吸内科-陈医生',
    createdAt: '2026-09-10T15:00:00',
    lastContactAt: '2026-09-13T09:00:00',
    remark: '嘱戒烟、规律吸入支气管扩张剂',
  },
  {
    followUpId: 'FU20260815003',
    patientId: 'P2026090004',
    followUpType: '用药随访',
    plan: '甲状腺功能亢进用药随访，复查甲功（TSH/FT3/FT4），调整甲巯咪唑剂量',
    nextFollowUpDate: '2026-09-16',
    status: '已逾期',
    responsible: '内分泌科-孙主任',
    createdAt: '2026-08-15T11:00:00',
    lastContactAt: '2026-08-15T11:00:00',
    remark: null,
  },
];
