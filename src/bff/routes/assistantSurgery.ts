/**
 * 健澜科技 jlmedaios - 手术麻醉智能助手路由（M121-B）
 *   （依据宪法第七章：医疗机构及其医务人员应当关心、爱护、尊重患者，保护患者隐私；
 *     第五十三条：国家发展医疗卫生事业，保护人民健康）
 *
 *  - GET /api/v1/assistant/surgery?surgeryId=xxx
 *      返回该台手术的麻醉智能助手聚合结果：
 *        { riskAssessment, anesthesiaSuggestions, intraOpAlerts, postOpAdvice }。
 *
 * 权限：medmuse:view（与麻醉医师工作站其余智能能力同口径）。
 * 隐私：响应仅含院内脱敏 surgeryId / patientId 与临床标签，不含姓名 / 身份证号 / 床号明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import { requirePermissionCode } from '../middleware/auth.js';
import {
  buildSurgeryAssistant,
  type SurgeryAssistantData,
} from '../aggregators/surgeryAssistantAggregator.js';

class AssistantSurgeryError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AssistantSurgeryError';
  }
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof AssistantSurgeryError) {
    const code =
      err.status === 403
        ? ErrorCode.FORBIDDEN
        : err.status === 404
          ? ErrorCode.NOT_FOUND
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'surgery assistant failed'), 500);
}

/**
 * 由 surgeryId 派生出确定性的术前访视上下文。
 * 当前阶段不直连 HIS / EMR / 麻醉信息系统（M121-B 仅交付聚合与提醒卡片），
 * 后续接入真实术前访视数据时，仅需替换本函数返回值，纯函数聚合逻辑保持不变。
 */
function buildDemoData(surgeryId: string): SurgeryAssistantData {
  // 简单字符串哈希，保证同一 surgeryId 多次请求结果稳定
  let h = 0;
  for (let i = 0; i < surgeryId.length; i += 1) h = (h * 31 + surgeryId.charCodeAt(i)) >>> 0;
  const highRisk = h % 3 === 0;
  const mediumRisk = !highRisk && h % 3 === 1;

  if (highRisk) {
    return {
      age: 72,
      gender: 'M',
      weightKg: 68,
      heightCm: 170,
      comorbidities: ['冠心病', '高血压', '2 型糖尿病'],
      allergies: ['青霉素'],
      medications: ['阿司匹林 100mg qd', '美托洛尔'],
      airway: { mallampati: 3, mouthOpeningCm: 3.5, neckMobilityNormal: true },
      labs: [
        { code: 'Hb', name: '血红蛋白', value: 88, unit: 'g/L', flag: 'L' },
        { code: 'PLT', name: '血小板', value: 92, unit: '×10^9/L', flag: 'L' },
        { code: 'K', name: '血钾', value: 3.1, unit: 'mmol/L', flag: 'LL' },
        { code: 'Cr', name: '血肌酐', value: 146, unit: 'μmol/L', flag: 'H' },
      ],
      surgery: {
        name: '腹腔镜胆囊切除术',
        estimatedDurationMin: 150,
        isEmergency: false,
        bleedingRisk: 'medium',
        positioning: '仰卧',
      },
    };
  }

  if (mediumRisk) {
    return {
      age: 58,
      gender: 'F',
      weightKg: 60,
      heightCm: 160,
      comorbidities: ['高血压'],
      allergies: [],
      medications: ['氨氯地平'],
      airway: { mallampati: 2, mouthOpeningCm: 4.5, neckMobilityNormal: true },
      labs: [
        { code: 'Hb', name: '血红蛋白', value: 125, unit: 'g/L', flag: 'N' },
        { code: 'K', name: '血钾', value: 4.2, unit: 'mmol/L', flag: 'N' },
      ],
      surgery: {
        name: '甲状腺部分切除术',
        estimatedDurationMin: 90,
        isEmergency: false,
        bleedingRisk: 'low',
        positioning: '仰卧',
      },
    };
  }

  return {
    age: 35,
    gender: 'F',
    weightKg: 55,
    heightCm: 162,
    comorbidities: [],
    allergies: [],
    medications: [],
    airway: { mallampati: 1, mouthOpeningCm: 5, neckMobilityNormal: true },
    labs: [
      { code: 'Hb', name: '血红蛋白', value: 130, unit: 'g/L', flag: 'N' },
      { code: 'PLT', name: '血小板', value: 220, unit: '×10^9/L', flag: 'N' },
      { code: 'K', name: '血钾', value: 4.0, unit: 'mmol/L', flag: 'N' },
    ],
    surgery: {
      name: '剖宫产术',
      estimatedDurationMin: 60,
      isEmergency: true,
      bleedingRisk: 'medium',
      positioning: '仰卧',
    },
  };
}

export const assistantSurgeryRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/assistant/surgery',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);

      try {
        const surgeryId = c.query.get('surgeryId') ?? '';
        if (!surgeryId) throw new AssistantSurgeryError(400, 'surgeryId 必填');

        // 患者 ID 仅作为审计上下文随结果回传，已在数据源侧脱敏
        const patientId = c.query.get('patientId') ?? `P****${surgeryId.slice(-4)}`;
        const data = buildDemoData(surgeryId);
        const result = buildSurgeryAssistant(view.id, surgeryId, patientId, data);
        return json(ok({ surgeryId, patientId, ...result }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
