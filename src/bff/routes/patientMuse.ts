/**
 * 健澜科技 jlmedaios - 患者 Personal Agent（Patient MUSE）专属路由（M117-A）
 *
 * 依据宪法第七章 7.7（患者 MUSE）：
 *   GET /api/v1/patient/muse/:patientId —— 返回某患者的健康画像视图
 *   （慢病标签 / 用药过敏史 / 就医偏好 / 个性化健康提醒）。
 *
 * 【质量与新场景】M175-D：在同端点追加「患者个人智能体深化」agent 字段——
 *   健康画像(疾病/用药/检查/过敏/家族史) / 就医偏好(时段/医生/缴费) /
 *   健康目标(减重/控糖/降压/运动) / 健康提醒(服药/复查/体检/疫苗)，
 *   并主动产出洞察、个性化服务推荐与逐目标进度跟踪，让智能体真帮患者、不只是看板。
 *   业务规则全部在 aggregators/patientMuseAggregator.ts 纯函数层。
 *
 * 权限边界（依据第七章个人数据归属）：
 *  - 医生角色（doctor）可查看任意患者画像（医生端工作台）；
 *  - 患者角色（patient）仅可查看本人画像（:id 必须等于登录用户 id）；
 *  - 越权访问他人 → 403 FORBIDDEN；未登录 → 401 UNAUTHORIZED。
 *
 * 医疗安全：本端点只读，不触发任何写回；返回数据为脱敏临床标签，
 *   不含患者姓名 / 身份证号 / 病案号明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildPatientMuse,
  buildPatientMUSE,
  recommendPatientService,
  trackPatientHealthProgress,
  type DeepHealthGoal,
  type PatientHistoryEntry,
  type PatientMedication,
  type PatientVisit,
} from '../aggregators/patientMuseAggregator.js';

/** DB 演示模式：返回样例健康画像，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 权限解析（纯函数，便于单测、角色差异）                              */
/* ------------------------------------------------------------------ */

/** 当前登录用户最小形状（与 Ctx.user 对齐） */
export interface PatientMuseUser {
  id: string;
  roles: string[];
}

/**
 * resolvePatientMuseTarget：解析本次要查看的患者号，并校验角色。
 *
 * 规则：
 *  - 角色含 doctor          → 可查看任意患者（医生端工作台）；
 *  - 角色仅含 patient       → 仅可查看本人（:id 必须等于 c.user.id）；
 *  - 其他角色 / 越权看他人 → forbidden（路由层转 403）。
 */
export function resolvePatientMuseTarget(
  user: PatientMuseUser,
  targetId: string,
): { allowed: string } | { forbidden: string } {
  const patientId = (targetId ?? '').trim();
  if (!patientId) {
    return { forbidden: '缺少患者标识 patientId' };
  }
  const isDoctor = user.roles.includes('doctor');
  const isPatient = user.roles.includes('patient');

  if (isDoctor) return { allowed: patientId };
  if (isPatient && user.id === patientId) return { allowed: patientId };
  if (isPatient) {
    return { forbidden: '权限不足：患者仅可查看本人健康画像' };
  }
  return { forbidden: '权限不足：仅医生或患者本人可访问健康画像' };
}

/* ------------------------------------------------------------------ */
/* 数据塑形                                                            */
/* ------------------------------------------------------------------ */

/** medmuse.patient_health_profile 的宽读行 */
interface ProfileRow {
  patient_id: unknown;
  chronic_conditions: unknown;
  medication_allergies: unknown;
  preference_tags: unknown;
  last_visit_summary: unknown;
  updated_at: unknown;
}

/** text[] 列归一为 string[] */
function toTextArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
  return [];
}

/**
 * 从 DB 拉取患者画像，并以「已沉淀画像 + 最近一次就诊摘要」为上下文，
 * 经纯函数 buildPatientMuse 塑形为统一视图（保证空画像也能派生提醒）。
 */
async function buildView(
  patientId: string,
): Promise<ReturnType<typeof buildPatientMuse>> {
  const db = getDb();
  const rows = (await db`
    SELECT patient_id, chronic_conditions, medication_allergies,
           preference_tags, last_visit_summary, updated_at
    FROM medmuse.patient_health_profile
    WHERE patient_id = ${patientId}
    LIMIT 1
  `) as ProfileRow[];

  const row = rows[0];
  const chronic = row ? toTextArray(row.chronic_conditions) : [];
  const allergies = row ? toTextArray(row.medication_allergies) : [];
  const tags = row ? toTextArray(row.preference_tags) : [];
  const summary = row && typeof row.last_visit_summary === 'string' ? row.last_visit_summary : '';

  // 已沉淀的画像字段直接作为纯函数入参的结构化输入；
  // history / medications / visits 本期无独立宽表，以画像字段映射：
  //   - chronicConditions 来自 history(chronic=true)；
  //   - allergies 来自 medications(allergy=true)；
  //   - visits 用最近一次摘要构造一条 visit，驱动复诊间隔与偏好派生。
  const history: PatientHistoryEntry[] = chronic.map((c) => ({
    condition: c,
    chronic: true,
  }));
  const medications: PatientMedication[] = allergies.map((a) => ({
    drugName: a,
    allergy: true,
  }));
  const visits: PatientVisit[] = summary
    ? [{ visitType: '复诊', visitDate: new Date().toISOString(), summary }]
    : [];

  // preference_tags 已沉淀，覆盖纯函数派生结果（DB 优先，缺失时回落派生）
  const view = buildPatientMuse(patientId, history, medications, visits);
  if (tags.length > 0) view.preferenceTags = tags;
  return view;
}

/** 演示模式样例：一位慢病患者的健康画像 */
function demoView(patientId: string): ReturnType<typeof buildPatientMuse> {
  const history: PatientHistoryEntry[] = [
    { condition: '2型糖尿病', chronic: true, recordedAt: '2024-03-01T00:00:00Z' },
    { condition: '原发性高血压', chronic: true, recordedAt: '2023-06-10T00:00:00Z' },
  ];
  const medications: PatientMedication[] = [
    { drugName: '阿司匹林', allergy: true, status: 'stopped' },
    { drugName: '二甲双胍', allergy: false, status: 'active' },
    { drugName: '缬沙坦', allergy: false, status: 'active' },
    { drugName: '阿托伐他汀', allergy: false, status: 'active' },
  ];
  const visits: PatientVisit[] = [
    { visitType: '复诊', visitDate: new Date(Date.now() - 30 * 86_400_000).toISOString(), summary: '血糖控制平稳，血压达标' },
    { visitType: '复诊', visitDate: new Date(Date.now() - 120 * 86_400_000).toISOString(), summary: '调整降压药' },
  ];
  void patientId;
  return buildPatientMuse(patientId, history, medications, visits);
}

/* ------------------------------------------------------------------ */
/* 【质量与新场景】M175-D：患者个人智能体深化（真帮患者，不只是看板）   */
/* ------------------------------------------------------------------ */

/** 由目标起止日期推算已过/总天数（纯日期计算，不触库） */
function daysBetween(start: string, end: string): { elapsed: number; total: number } {
  const MS = 86_400_000;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (Number.isNaN(s) || Number.isNaN(e)) return { elapsed: 0, total: 365 };
  const total = Math.max(1, Math.round((e - s) / MS));
  const elapsed = Math.max(0, Math.min(total, Math.round((now - s) / MS)));
  return { elapsed, total };
}

/**
 * 组装 M175-D 深度智能体：个人画像 + 个性化服务推荐 + 逐目标进度跟踪。
 * 业务规则全部在 aggregators/patientMuseAggregator.ts 纯函数层，此处仅穿线。
 */
function buildDeepAgent(patientId: string) {
  const muse = buildPatientMUSE(patientId);

  // 由画像推导推荐上下文：已知慢病 / 是否有异常化验 / 最差依从性
  const knownConditions = muse.profile.diseases.map((d) => d.name);
  const hasAbnormalLab = muse.profile.checkups.some((c) => c.result === 'abnormal');
  const adherenceRank = { poor: 0, partial: 1, good: 2 } as const;
  const worst = muse.profile.medications
    .map((m) => m.adherence ?? 'good')
    .reduce<'good' | 'partial' | 'poor'>(
      (acc, cur) => (adherenceRank[cur] < adherenceRank[acc] ? cur : acc),
      'good',
    );
  const recommendation = recommendPatientService(patientId, {
    knownConditions,
    hasAbnormalLab,
    medicationAdherence: worst,
    focusGoal: 'glucose_control',
  });

  // 逐目标跟踪进度
  const progress = muse.goals.map((g: DeepHealthGoal) => {
    const { elapsed, total } = daysBetween(g.startDate, g.deadline);
    return trackPatientHealthProgress(patientId, {
      type: g.type,
      startValue: g.startValue,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      unit: g.unit,
      daysElapsed: elapsed,
      daysTotal: total,
    });
  });

  return { muse, recommendation, progress };
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const patientMuseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/muse/:patientId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      const resolved = resolvePatientMuseTarget(c.user!, c.params.patientId);
      if ('forbidden' in resolved) {
        return json(fail(ErrorCode.FORBIDDEN, resolved.forbidden, c.traceId), 403);
      }
      const patientId = resolved.allowed;

      try {
        // M117-A：健康画像标签视图（保留，DB 优先）
        const view = isDemo
          ? demoView(patientId)
          : await buildView(patientId);

        // M175-D：患者个人智能体深化（画像/偏好/目标/提醒 + 洞察/推荐/进度）
        const agent = buildDeepAgent(patientId);

        return json(ok({
          demo: isDemo,
          patientId,
          ...view,
          agent,
        }));
      } catch (err) {
        console.error(`[patientMuse] GET /patient/muse/:patientId [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '患者健康画像加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
