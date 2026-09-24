/**
 * 健澜科技数智医院智能体 - 获取患者详细档案工具
 *
 * 工具名：get_patient_detail
 * 功能：根据患者ID获取患者完整档案，包括基本信息、过敏史、既往史、家族史、当前用药、生命体征
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool, maskAddress, maskIdCard, maskPhone } from '../framework.js';
import { clinicalData, sourceTag } from '../../data/clinicalData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetPatientDetailInput = z.object({
  patientId: z.string().describe('患者唯一ID（必填）'),
  includeHistory: z.boolean().default(false).describe('是否包含既往病史摘要'),
  includeMedications: z.boolean().default(true).describe('是否包含当前用药'),
  includeAllergies: z.boolean().default(true).describe('是否包含过敏史'),
});

const GetPatientDetailOutput = z.object({
  success: z.boolean(),
  data: z.object({
    patientId: z.string(),
    name: z.string(),
    gender: z.string(),
    age: z.number(),
    birthDate: z.string().nullable(),
    idCardMasked: z.string().nullable().describe('脱敏身份证号'),
    phoneMasked: z.string().nullable(),
    addressMasked: z.string().nullable(),
    bloodType: z.string().nullable(),
    allergies: z.array(
      z.object({
        allergen: z.string(),
        reaction: z.string(),
        severity: z.enum(['轻度', '中度', '重度', '危及生命']),
        recordedAt: z.string(),
      }),
    ),
    pastHistory: z.array(
      z.object({
        disease: z.string(),
        diagnosedAt: z.string().nullable(),
        status: z.enum(['治愈', '好转', '未愈', '死亡']),
      }),
    ),
    currentMedications: z.array(
      z.object({
        drugName: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        startDate: z.string(),
        prescribingDoctor: z.string(),
      }),
    ),
    latestVitals: z.object({
      temperature: z.number().nullable(),
      pulse: z.number().nullable(),
      respiration: z.number().nullable(),
      bloodPressure: z.string().nullable(),
      spo2: z.number().nullable(),
      measuredAt: z.string().nullable(),
    }),
  }),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 获取患者详细档案
 *
 * 根据患者ID获取完整档案，敏感字段（身份证、手机号、地址）自动脱敏。
 *
 * @param input - 包含patientId和可选的包含项控制
 * @param context - 工具执行上下文
 * @returns 患者完整档案
 * @throws {MedicalAgentError} 患者不存在时抛出
 */
async function executeGetPatientDetail(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetPatientDetailInput.parse(input);

  const patient = await clinicalData.getPatient(parsed.patientId);

  if (!patient) {
    return {
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `患者 ${parsed.patientId} 不存在`,
        details: { patientId: parsed.patientId },
      },
    };
  }

  return {
    success: true,
    data: {
      success: true,
      data: {
        patientId: patient.patientId,
        name: patient.name,
        gender: patient.gender,
        age: patient.age,
        birthDate: patient.birthDate,
        idCardMasked: patient.idCard ? maskIdCard(patient.idCard) : null,
        phoneMasked: patient.phone ? maskPhone(patient.phone) : null,
        addressMasked: patient.address ? maskAddress(patient.address) : null,
        bloodType: patient.bloodType,
        allergies: parsed.includeAllergies ? patient.allergies : [],
        pastHistory: parsed.includeHistory ? patient.pastHistory : [],
        currentMedications: parsed.includeMedications ? patient.currentMedications : [],
        latestVitals: patient.latestVitals,
        _source: sourceTag(),
      },
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getPatientDetailTool = buildMedicalTool({
  name: 'get_patient_detail',
  description:
    '根据患者ID获取患者完整档案，包括基本信息（脱敏）、过敏史、既往史、当前用药、最新生命体征。需提供患者唯一ID。',
  category: MedicalToolCategory.PATIENT,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['patient:read'],
  inputSchema: GetPatientDetailInput,
  outputSchema: GetPatientDetailOutput,
  execute: executeGetPatientDetail,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '患者详细档案',
  getActivityDescription: (input: unknown) => {
    const parsed = GetPatientDetailInput.safeParse(input);
    return parsed.success ? `获取患者档案: ${parsed.data.patientId}` : '获取患者档案';
  },
});

export type GetPatientDetailInputType = z.infer<typeof GetPatientDetailInput>;
export type GetPatientDetailOutputType = z.infer<typeof GetPatientDetailOutput>;
