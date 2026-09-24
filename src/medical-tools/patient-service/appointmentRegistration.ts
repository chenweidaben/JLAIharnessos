/**
 * 健澜科技数智医院智能体 - 预约挂号工具
 *
 * 工具名：appointment_registration
 * 功能：为患者预约挂号，校验号源余量并生成预约记录
 * 风险等级：medium（需确认，涉及患者就诊安排）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import {
  APPOINTMENT_STORE,
  MOCK_DEPARTMENTS,
  MOCK_DOCTOR_SLOTS,
  type MockAppointment,
} from './patientServiceData.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const AppointmentRegistrationInput = z.object({
  patientId: z.string().describe('患者ID'),
  department: z.enum(MOCK_DEPARTMENTS).describe('预约科室'),
  doctorId: z.string().optional().describe('指定医生ID（缺省由科室首个可用医生匹配）'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
    .describe('就诊日期'),
  timeSlot: z.string().optional().describe('时间段（如08:00-09:00），缺省自动选择最早有余号时段'),
  visitType: z.enum(['初诊', '复诊', '急诊', '健康体检']).default('复诊').describe('就诊类型'),
});

const AppointmentRegistrationOutput = z.object({
  success: z.boolean(),
  appointmentId: z.string(),
  patientId: z.string(),
  department: z.string(),
  doctorName: z.string(),
  date: z.string(),
  timeSlot: z.string(),
  visitType: z.string(),
  status: z.string(),
  queueNo: z.number().describe('挂号序号'),
  registeredAt: z.string(),
  notice: z.string().describe('就诊提示'),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 预约挂号
 *
 * 校验患者存在、科室/医生号源匹配与余号，余号充足时锁定号源并生成预约记录；
 * 指定时段无余号或未排班时返回错误。
 *
 * @param input - 挂号参数
 * @param context - 工具执行上下文
 * @returns 预约结果
 */
async function executeAppointmentRegistration(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = AppointmentRegistrationInput.parse(input);

  // 校验患者存在
  const patient = MOCK_PATIENTS.find((p) => p.patientId === parsed.patientId);
  if (!patient) {
    return {
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `患者 ${parsed.patientId} 不存在`,
      },
    };
  }

  // 匹配排班：科室 + 日期 + （可选医生）
  const schedules = MOCK_DOCTOR_SLOTS.filter(
    (s) => s.department === parsed.department && s.date === parsed.date,
  );
  const matched = parsed.doctorId
    ? schedules.find((s) => s.doctorId === parsed.doctorId)
    : schedules[0];

  if (!matched) {
    return {
      success: false,
      error: {
        code: 'NO_SCHEDULE',
        message: `${parsed.department} 在 ${parsed.date} 未查询到可预约排班`,
        details: { department: parsed.department, date: parsed.date },
      },
    };
  }

  // 选择时段：指定时段或自动最早余号
  let chosen = matched.timeSlots.find(
    (t) => parsed.timeSlot !== undefined && t.timeRange === parsed.timeSlot,
  );
  if (!chosen) {
    if (parsed.timeSlot) {
      return {
        success: false,
        error: {
          code: 'SLOT_NOT_AVAILABLE',
          message: `${matched.doctorName} 在 ${parsed.date} ${parsed.timeSlot} 时段不可约`,
        },
      };
    }
    // 自动选择最早有余号时段
    chosen = matched.timeSlots.find((t) => t.booked < t.totalQuota);
    if (!chosen) {
      return {
        success: false,
        error: {
          code: 'SLOT_FULL',
          message: `${matched.doctorName} 在 ${parsed.date} 所有时段已约满`,
        },
      };
    }
  }

  // 余号检查
  if (chosen.booked >= chosen.totalQuota) {
    return {
      success: false,
      error: {
        code: 'SLOT_FULL',
        message: `${matched.doctorName} 在 ${parsed.date} ${chosen.timeRange} 已约满`,
      },
    };
  }

  // 锁定号源
  chosen.booked += 1;
  const queueNo = chosen.booked;
  const appointmentId = `AP${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const registeredAt = new Date().toISOString();

  const record: MockAppointment = {
    appointmentId,
    patientId: parsed.patientId,
    department: parsed.department,
    doctorId: matched.doctorId,
    doctorName: matched.doctorName,
    date: parsed.date,
    timeSlot: chosen.timeRange,
    visitType: parsed.visitType,
    status: '已预约',
    createdAt: registeredAt,
  };
  APPOINTMENT_STORE.push(record);

  return {
    success: true,
    data: {
      success: true,
      appointmentId,
      patientId: parsed.patientId,
      department: parsed.department,
      doctorName: matched.doctorName,
      date: parsed.date,
      timeSlot: chosen.timeRange,
      visitType: parsed.visitType,
      status: '已预约',
      queueNo,
      registeredAt,
      notice: `请于就诊日提前15分钟到${parsed.department}分诊台报到，携带就诊卡/医保卡。操作人：${context.medicalUser.name}`,
      _demoMode: true,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const appointmentRegistrationTool = buildMedicalTool({
  name: 'appointment_registration',
  description:
    '为患者预约挂号：按科室、就诊日期、医生、时段查询号源，校验余号后生成预约记录并分配挂号序号。支持初诊/复诊/急诊/体检。',
  category: MedicalToolCategory.PATIENT,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['appointment:create'],
  inputSchema: AppointmentRegistrationInput,
  outputSchema: AppointmentRegistrationOutput,
  execute: executeAppointmentRegistration,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  userFacingName: () => '预约挂号',
  getActivityDescription: (input: unknown) => {
    const parsed = AppointmentRegistrationInput.safeParse(input);
    if (parsed.success) {
      return `预约挂号: ${parsed.data.department} ${parsed.data.date}`;
    }
    return '预约挂号';
  },
});

export type AppointmentRegistrationInputType = z.infer<typeof AppointmentRegistrationInput>;
export type AppointmentRegistrationOutputType = z.infer<typeof AppointmentRegistrationOutput>;
