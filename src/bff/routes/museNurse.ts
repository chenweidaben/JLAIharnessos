/**
 * 健澜科技 jlmedaios - 护士 MUSE 专属功能路由（M116-A）
 *
 * 依据宪法第七章 7.6（护士 Personal Agent：护理经验沉淀与风险识别闭环）：
 *   GET /api/v1/muse/nurse —— 返回当前登录护士的个人护理经验页数据：
 *     风险识别统计（totalCare / riskIdentified / interventionSuccessRate）+
 *     交班经验提取（recentTimeline）+ 护理技巧标签云（careSkillTags）。
 *
 * 权限边界（依据第七章个人数据归属）：
 *  - 只能看自己：nurseId 缺省即当前登录员工 c.user.id；
 *  - admin 可传 ?nurseId=xxx 查看他人护士主页（用于护士长带教 / 抽检复盘）；
 *  - 非 admin 传 nurseId → 403 FORBIDDEN。
 *
 * 医疗安全：本端点纯只读，不触发任何护理记录写入；返回数据均为护士本人
 *   科室级聚合与操作摘要，不含患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildNurseMuse,
  type NurseCareRecord,
  type NurseRiskEvent,
} from '../aggregators/nurseMuseAggregator';

/** 无 DB 演示模式：返回样例护理经验页，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 权限解析（纯函数，便于单测「角色差异」）                               */
/* ------------------------------------------------------------------ */

/** 当前登录用户最小形状（与 Ctx.user 对齐） */
export interface MuseNurseUser {
  id: string;
  roles: string[];
}

/**
 * resolveNurseTargetId：解析本次主页要查看的护士工号。
 *
 * 规则：
 *  - 未传 nurseId → 看自己（nurseId = c.user.id）；
 *  - 传了 nurseId 且用户角色含 admin → 看他人；
 *  - 传了 nurseId 且用户非 admin → 返回 forbidden（路由层转 403）。
 */
export function resolveNurseTargetId(
  user: MuseNurseUser,
  queryNurseId: string | null | undefined,
): { nurseId: string } | { forbidden: string } {
  const requested = (queryNurseId ?? '').trim();
  if (!requested) return { nurseId: user.id };
  if (!user.roles.includes('admin')) {
    return { forbidden: '权限不足：仅 admin 可查看他人护士 MUSE 主页' };
  }
  return { nurseId: requested };
}

/* ------------------------------------------------------------------ */
/* 数据塑形                                                             */
/* ------------------------------------------------------------------ */

/** 一行 nurse_care_memory 的宽松读取 */
interface CareRow {
  nurse_id: unknown;
  patient_dept: unknown;
  care_type: unknown;
  risk_level: unknown;
  intervention: unknown;
  outcome: unknown;
  created_at: unknown;
}

/** 从 DB 拉取护士护理操作记忆，塑形为纯函数入参 */
async function buildView(nurseId: string) {
  const db = getDb();

  const rows = (await db`
    SELECT nurse_id, patient_dept, care_type, risk_level, intervention, outcome, created_at
    FROM medmuse.nurse_care_memory
    WHERE nurse_id = ${nurseId}
    ORDER BY created_at DESC
    LIMIT 200
  `) as CareRow[];

  const careRecords: NurseCareRecord[] = rows.map((r) => ({
    careType: typeof r.care_type === 'string' ? r.care_type : '',
    patientDept: typeof r.patient_dept === 'string' ? r.patient_dept : null,
    riskLevel: typeof r.risk_level === 'string' ? r.risk_level : null,
    intervention: typeof r.intervention === 'string' ? r.intervention : null,
    outcome:
      r.outcome === 'success' || r.outcome === 'failure' || r.outcome === 'mixed'
        ? r.outcome
        : null,
    createdAt: typeof r.created_at === 'string' ? r.created_at : null,
  }));

  // 风险事件流：护理记忆中带风险等级的记录即护士识别到的风险（单表自洽）
  const riskEvents: NurseRiskEvent[] = careRecords
    .filter((r) => !!r.riskLevel)
    .map((r) => ({ riskLevel: r.riskLevel as string, createdAt: r.createdAt ?? null }));

  return buildNurseMuse(nurseId, careRecords, riskEvents);
}

/** 演示模式样例：一名护士近 30 天逐步沉淀护理经验记忆 */
function demoView(nurseId: string, nurseName: string) {
  const today = new Date();
  const at = (offsetDays: number, hh = 9): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10) + `T${pad2(hh)}:00:00.000Z`;
  };
  void nurseName;

  const careRecords: NurseCareRecord[] = [
    { careType: '跌倒风险评估', patientDept: '老年医学科', riskLevel: 'high', intervention: '床栏拉起 + 家属陪护宣教 + 防滑鞋发放', outcome: 'success', createdAt: at(0, 10) },
    { careType: '压疮预防', patientDept: '老年医学科', riskLevel: 'medium', intervention: 'q2h 翻身 + 减压垫 + Braden 评分复评', outcome: 'success', createdAt: at(1, 14) },
    { careType: '管路护理', patientDept: '普外科', riskLevel: 'high', intervention: '深静脉导管双重固定 + 每班敷料检查', outcome: 'mixed', createdAt: at(2, 11) },
    { careType: '跌倒风险评估', patientDept: '老年医学科', riskLevel: 'medium', intervention: 'Morse 量表复评 + 呼叫器置随手可及位', outcome: 'success', createdAt: at(4, 9) },
    { careType: '用药观察', patientDept: '心内科', riskLevel: 'low', intervention: '抗凝药后 2h 巡视穿刺点 + 皮肤瘀斑记录', outcome: 'failure', createdAt: at(6, 20) },
    { careType: '压疮预防', patientDept: '神经内科', riskLevel: 'medium', intervention: '气垫床 + 营养科会诊联合干预', outcome: 'success', createdAt: at(10, 8) },
    { careType: '管路护理', patientDept: '普外科', riskLevel: 'high', intervention: '引流管标识双人核对 + 意外拔管应急演练', outcome: 'success', createdAt: at(15, 16) },
    { careType: '跌倒风险评估', patientDept: '老年医学科', riskLevel: 'high', intervention: '夜间留地灯 + 保洁拖地警示牌联动', outcome: 'success', createdAt: at(21, 19) },
  ];
  const riskEvents: NurseRiskEvent[] = careRecords
    .filter((r) => !!r.riskLevel)
    .map((r) => ({ riskLevel: r.riskLevel as string, createdAt: r.createdAt ?? null }));

  return buildNurseMuse(nurseId, careRecords, riskEvents);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const museNurseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/nurse',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // 权限：只能看自己；admin 可传 nurseId 看他人
      const resolved = resolveNurseTargetId(c.user!, c.query.get('nurseId'));
      if ('forbidden' in resolved) {
        return json(fail(ErrorCode.FORBIDDEN, resolved.forbidden, c.traceId), 403);
      }

      try {
        const view = isDemo
          ? demoView(resolved.nurseId, c.user!.name)
          : await buildView(resolved.nurseId);
        return json(ok({ demo: isDemo, nurseId: resolved.nurseId, ...view }));
      } catch (err) {
        console.error(`[museNurse] GET /nurse [${c.traceId}] nurse=${resolved.nurseId}`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '护士 MUSE 主页加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
