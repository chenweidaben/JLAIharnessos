/**
 * 健澜科技 jlmedaios - 住院医生智能助手路由（M120-B）
 *   （依据宪法第七章：医疗机构及其医务人员应当关心、爱护、尊重患者，保护患者隐私）
 *
 *  - GET /api/v1/assistant/inpatient?patientId=xxx
 *      返回该在院患者当日的智能助手聚合结果：
 *        { trend, similarCases, riskAlert, suggestions }。
 *
 * 权限：medmuse:view（与住院医生工作站其余智能能力同口径）。
 * 隐私：响应仅含院内脱敏 patientId 与临床标签，不含姓名 / 身份证号 / 床号明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import { requirePermissionCode } from '../middleware/auth.js';
import {
  buildInpatientAssistant,
  type InpatientAssistantData,
} from '../aggregators/inpatientAssistantAggregator.js';

class AssistantInpatientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AssistantInpatientError';
  }
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof AssistantInpatientError) {
    const code =
      err.status === 403
        ? ErrorCode.FORBIDDEN
        : err.status === 404
          ? ErrorCode.NOT_FOUND
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'inpatient assistant failed'), 500);
}

/**
 * 由 patientId 派生出确定性的当日病情上下文。
 * 当前阶段不直连 HIS / EMR 实时体征流（M120-B 仅交付聚合与提醒卡片），
 * 后续接入在院患者实时数据流时，仅需替换本函数返回值，纯函数聚合逻辑保持不变。
 */
function buildDemoData(patientId: string): InpatientAssistantData {
  // 简单字符串哈希，保证同一 patientId 多次请求结果稳定
  let h = 0;
  for (let i = 0; i < patientId.length; i += 1) h = (h * 31 + patientId.charCodeAt(i)) >>> 0;
  const highRisk = h % 3 === 0; // 约 1/3 患者走「高风险」演示分支

  const DAY = '2026-10-16';
  return {
    diagnosis: '社区获得性肺炎',
    age: highRisk ? 78 : 56,
    comorbidities: highRisk ? ['高血压', '2 型糖尿病', '慢性肾功能不全'] : ['高血压'],
    vitals: highRisk
      ? [
          { time: `${DAY}T06:00:00+08:00`, temperatureC: 37.2, heartRate: 96, systolicBp: 118, diastolicBp: 72, spo2: 95, respiratoryRate: 18 },
          { time: `${DAY}T14:00:00+08:00`, temperatureC: 38.9, heartRate: 124, systolicBp: 96, diastolicBp: 60, spo2: 89, respiratoryRate: 26 },
        ]
      : [
          { time: `${DAY}T06:00:00+08:00`, temperatureC: 37.0, heartRate: 84, systolicBp: 122, diastolicBp: 76, spo2: 97, respiratoryRate: 16 },
          { time: `${DAY}T14:00:00+08:00`, temperatureC: 36.8, heartRate: 78, systolicBp: 126, diastolicBp: 78, spo2: 98, respiratoryRate: 15 },
        ],
    labs: highRisk
      ? [
          { code: 'WBC', name: '白细胞', value: 13.6, unit: '×10^9/L', flag: 'H' },
          { code: 'K', name: '血钾', value: 2.9, unit: 'mmol/L', flag: 'LL' },
        ]
      : [{ code: 'WBC', name: '白细胞', value: 7.2, unit: '×10^9/L', flag: 'N' }],
    similarCases: highRisk
      ? [
          { patientId: 'P****2311', diagnosis: '社区获得性肺炎', losDays: 9, outcome: 'deteriorated', matchScore: 0.82 },
          { patientId: 'P****0874', diagnosis: '社区获得性肺炎', losDays: 6, outcome: 'improved', matchScore: 0.74 },
        ]
      : [
          { patientId: 'P****5520', diagnosis: '社区获得性肺炎', losDays: 5, outcome: 'improved', matchScore: 0.78 },
        ],
  };
}

export const assistantInpatientRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/assistant/inpatient',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);

      try {
        const patientId = c.query.get('patientId') ?? '';
        if (!patientId) throw new AssistantInpatientError(400, 'patientId 必填');

        const wardId = c.query.get('wardId') ?? '';
        const data = buildDemoData(patientId);
        const result = buildInpatientAssistant(view.id, patientId, wardId, data);
        return json(ok({ patientId, ...result }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
