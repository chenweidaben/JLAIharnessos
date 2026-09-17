/**
 * 健澜科技数智医院智能体 - 就诊提醒工具
 *
 * 工具名：visit_reminder
 * 功能：汇总患者即将到来的预约就诊与待办随访提醒
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { APPOINTMENT_STORE, FOLLOW_UP_STORE } from './patientServiceData.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const VisitReminderInput = z.object({
  patientId: z.string().describe('患者ID'),
  reminderType: z
    .enum(['all', 'appointment', 'followUp'])
    .default('all')
    .describe('提醒类型：all全部 / appointment预约就诊 / followUp随访'),
  daysAhead: z.number().int().positive().max(90).default(7).describe('向前查看天数（默认7天内）'),
});

const VisitReminderOutput = z.object({
  success: z.boolean(),
  patientId: z.string(),
  patientName: z.string().describe('脱敏后的患者姓名'),
  daysAhead: z.number(),
  total: z.number(),
  reminders: z.array(
    z.object({
      reminderId: z.string(),
      type: z.enum(['预约就诊', '待随访', '逾期随访']),
      title: z.string(),
      scheduledDate: z.string(),
      daysLeft: z.number().describe('距今天数（负数表示已逾期）'),
      department: z.string().nullable(),
      detail: z.string(),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 就诊提醒
 *
 * 汇总患者未来N天内的预约就诊与随访计划，按日期排序。
 * 随访计划中 nextFollowUpDate 已过但未完成的标记为"逾期随访"。
 *
 * @param input - 患者ID与提醒参数
 * @param context - 工具执行上下文
 * @returns 提醒列表
 */
async function executeVisitReminder(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = VisitReminderInput.parse(input);

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

  const today = new Date().toISOString().slice(0, 10);
  const reminders: {
    reminderId: string;
    type: '预约就诊' | '待随访' | '逾期随访';
    title: string;
    scheduledDate: string;
    daysLeft: number;
    department: string | null;
    detail: string;
  }[] = [];

  // ---- 预约就诊提醒 ----
  if (parsed.reminderType === 'all' || parsed.reminderType === 'appointment') {
    for (const apt of APPOINTMENT_STORE) {
      if (apt.patientId !== parsed.patientId) continue;
      if (apt.status !== '已预约') continue;
      const daysLeft = Math.round(
        (new Date(apt.date).getTime() - new Date(today).getTime()) / 86400000,
      );
      if (daysLeft >= 0 && daysLeft <= parsed.daysAhead) {
        reminders.push({
          reminderId: apt.appointmentId,
          type: '预约就诊',
          title: `${apt.department} ${apt.doctorName} ${apt.visitType}`,
          scheduledDate: apt.date,
          daysLeft,
          department: apt.department,
          detail: `就诊时段 ${apt.timeSlot}，请提前15分钟报到`,
        });
      }
    }
  }

  // ---- 随访提醒 ----
  if (parsed.reminderType === 'all' || parsed.reminderType === 'followUp') {
    for (const fu of FOLLOW_UP_STORE) {
      if (fu.patientId !== parsed.patientId) continue;
      if (fu.status === '已完成' || fu.status === '已取消') continue;
      const daysLeft = Math.round(
        (new Date(fu.nextFollowUpDate).getTime() - new Date(today).getTime()) / 86400000,
      );
      // 逾期随访：daysLeft < 0；待随访：0..daysAhead
      if (daysLeft < 0) {
        reminders.push({
          reminderId: fu.followUpId,
          type: '逾期随访',
          title: `${fu.followUpType}（已逾期）`,
          scheduledDate: fu.nextFollowUpDate,
          daysLeft,
          department: null,
          detail: fu.plan,
        });
      } else if (daysLeft <= parsed.daysAhead) {
        reminders.push({
          reminderId: fu.followUpId,
          type: '待随访',
          title: fu.followUpType,
          scheduledDate: fu.nextFollowUpDate,
          daysLeft,
          department: null,
          detail: fu.plan,
        });
      }
    }
  }

  // 按日期升序
  reminders.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  // 脱敏患者姓名（保留姓）
  const maskedName =
    patient.name.length > 1 ? patient.name[0] + '*'.repeat(patient.name.length - 1) : patient.name;

  return {
    success: true,
    data: {
      success: true,
      patientId: parsed.patientId,
      patientName: maskedName,
      daysAhead: parsed.daysAhead,
      total: reminders.length,
      reminders,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const visitReminderTool = buildMedicalTool({
  name: 'visit_reminder',
  description:
    '汇总患者就诊提醒：即将到来的预约就诊（按科室/医生/时段）与待办/逾期随访计划，支持按提醒类型和向前天数筛选。返回脱敏患者姓名。',
  category: MedicalToolCategory.PATIENT,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['appointment:read', 'followup:read'],
  inputSchema: VisitReminderInput,
  outputSchema: VisitReminderOutput,
  execute: executeVisitReminder,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '就诊提醒',
  getActivityDescription: (input: unknown) => {
    const parsed = VisitReminderInput.safeParse(input);
    return parsed.success ? `就诊提醒: 患者${parsed.data.patientId}` : '就诊提醒';
  },
});

export type VisitReminderInputType = z.infer<typeof VisitReminderInput>;
export type VisitReminderOutputType = z.infer<typeof VisitReminderOutput>;
