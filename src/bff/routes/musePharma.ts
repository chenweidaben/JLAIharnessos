/**
 * 健澜科技 jlmedaios - 药师个人审方经验页 BFF 路由（M116-B）
 *
 * 依据宪法第七章 7.6（药师 Personal Agent）：
 *   GET /api/v1/muse/pharma —— 返回当前登录药师的个人审方经验页数据：
 *     拦截统计（总审方 / 拦截不合理）+ 医生采纳率 + 高频问题药物组合 Top10
 *     + 个人审方准确率学习曲线。
 *
 * 权限边界（依据第七章个人数据归属）：
 *  - 只能看自己：staffId 缺省即当前登录员工 c.user.id；
 *  - admin 可传 ?staffId=xxx 查看他人经验页（用于带教 / 抽检复盘）；
 *  - 非 admin 传 staffId → 403 FORBIDDEN。
 *
 * 医疗安全：本端点纯只读，不触发任何审方决策写入；返回数据均为岗位级聚合
 *   与脱敏摘要，不含患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildPharmaMuse,
  type PharmaAuditRecord,
  type PharmaIntervention,
  type PharmaMuse,
} from '../aggregators/pharmaMuseAggregator';

/** 无 DB 演示模式：返回样例经验页，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 权限解析（纯函数，便于单测「角色差异」）                               */
/* ------------------------------------------------------------------ */

/** 当前登录用户最小形状（与 Ctx.user 对齐） */
export interface MusePharmaUser {
  id: string;
  roles: string[];
}

/**
 * resolvePharmaTargetStaffId：解析本次经验页要查看的药师工号。
 *
 * 规则（与 museHome 一致）：
 *  - 未传 staffId → 看自己（staffId = c.user.id）；
 *  - 传了 staffId 且用户角色含 admin → 看他人；
 *  - 传了 staffId 且用户非 admin → 返回 forbidden（路由层转 403）。
 */
export function resolvePharmaTargetStaffId(
  user: MusePharmaUser,
  queryStaffId: string | null | undefined,
): { staffId: string } | { forbidden: string } {
  const requested = (queryStaffId ?? '').trim();
  if (!requested) return { staffId: user.id };
  if (!user.roles.includes('admin')) {
    return { forbidden: '权限不足：仅 admin 可查看他人药师 MUSE 经验页' };
  }
  return { staffId: requested };
}

/* ------------------------------------------------------------------ */
/* 数据塑形                                                             */
/* ------------------------------------------------------------------ */

/** 一行 pharma_audit_memory 的宽松读取 */
interface PharmaMemoryRow {
  pharmacist_id: unknown;
  drug_pair: unknown;
  issue_type: unknown;
  intervention: unknown;
  outcome: unknown;
  created_at: unknown;
}

/** outcome=blocked 视为不合理处方被拦截 */
function rowToAuditRecord(r: PharmaMemoryRow): PharmaAuditRecord {
  return {
    drugPair: typeof r.drug_pair === 'string' ? r.drug_pair : '',
    issueType: typeof r.issue_type === 'string' ? r.issue_type : '',
    blocked: typeof r.outcome === 'string' && r.outcome.trim().toLowerCase() === 'blocked',
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : typeof r.created_at === 'string'
          ? r.created_at
          : new Date().toISOString(),
  };
}

/** intervention 非空的行才构成一次「药师干预」回流 */
function rowToIntervention(r: PharmaMemoryRow): PharmaIntervention | null {
  const intervention = typeof r.intervention === 'string' ? r.intervention.trim() : '';
  if (!intervention) return null;
  return {
    drugPair: typeof r.drug_pair === 'string' ? r.drug_pair : '',
    intervention,
    outcome: typeof r.outcome === 'string' ? r.outcome : '',
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : typeof r.created_at === 'string'
          ? r.created_at
          : new Date().toISOString(),
  };
}

/** 从 medmuse.pharma_audit_memory 拉取该药师全部审方经验记忆并塑形为纯函数入参 */
async function loadPharmaMuse(staffId: string): Promise<PharmaMuse> {
  const db = getDb();
  const rows = (await db`
    SELECT pharmacist_id, drug_pair, issue_type, intervention, outcome, created_at
    FROM medmuse.pharma_audit_memory
    WHERE pharmacist_id = ${staffId}
    ORDER BY created_at DESC
    LIMIT 500
  `) as PharmaMemoryRow[];

  const auditRecords = rows.map(rowToAuditRecord);
  const interventions = rows
    .map(rowToIntervention)
    .filter((i): i is PharmaIntervention => i !== null);

  return buildPharmaMuse(staffId, auditRecords, interventions);
}

/** 演示模式样例：一名药师近几日的审方拦截与干预回流 */
function demoPharmaMuse(staffId: string): PharmaMuse {
  const today = new Date();
  const at = (offsetDays: number, hh = 9): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    d.toISOString();
    return d.toISOString();
  };
  const auditRecords: PharmaAuditRecord[] = [
    { drugPair: '华法林||阿司匹林', issueType: 'ddi', blocked: true, createdAt: at(0, 9) },
    { drugPair: '华法林||阿司匹林', issueType: 'ddi', blocked: true, createdAt: at(0, 11) },
    { drugPair: '二甲双胍||造影剂', issueType: 'contraindication', blocked: true, createdAt: at(1, 10) },
    { drugPair: '对乙酰氨基酚||其他NSAID', issueType: 'duplicate', blocked: false, createdAt: at(1, 15) },
    { drugPair: '华法林||阿司匹林', issueType: 'ddi', blocked: false, createdAt: at(2, 9) },
    { drugPair: '辛伐他汀||克拉霉素', issueType: 'ddi', blocked: true, createdAt: at(3, 14) },
    { drugPair: '二甲双胍||造影剂', issueType: 'contraindication', blocked: false, createdAt: at(5, 10) },
    { drugPair: '辛伐他汀||克拉霉素', issueType: 'ddi', blocked: true, createdAt: at(6, 16) },
    { drugPair: '华法林||阿司匹林', issueType: 'ddi', blocked: false, createdAt: at(8, 9) },
  ];
  const interventions: PharmaIntervention[] = [
    { drugPair: '华法林||阿司匹林', intervention: '建议改用单药抗凝并监测INR', outcome: 'adopted', createdAt: at(0, 9) },
    { drugPair: '二甲双胍||造影剂', intervention: '建议造影前48h停用二甲双胍', outcome: 'adopted', createdAt: at(1, 10) },
    { drugPair: '对乙酰氨基酚||其他NSAID', intervention: '建议复核重复用药剂量', outcome: 'rejected', createdAt: at(1, 15) },
    { drugPair: '辛伐他汀||克拉霉素', intervention: '建议他汀暂换为普伐他汀', outcome: 'adopted', createdAt: at(3, 14) },
    { drugPair: '辛伐他汀||克拉霉素', intervention: '建议他汀暂换为普伐他汀', outcome: 'pending', createdAt: at(6, 16) },
  ];
  return buildPharmaMuse(staffId, auditRecords, interventions);
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const musePharmaRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/pharma',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // 权限：只能看自己；admin 可传 staffId 看他人
      const resolved = resolvePharmaTargetStaffId(c.user!, c.query.get('staffId'));
      if ('forbidden' in resolved) {
        return json(fail(ErrorCode.FORBIDDEN, resolved.forbidden, c.traceId), 403);
      }

      try {
        if (isDemo) {
          const view = demoPharmaMuse(resolved.staffId);
          return json(ok({ demo: true, staffId: resolved.staffId, ...view }));
        }
        const view = await loadPharmaMuse(resolved.staffId);
        return json(ok({ demo: false, staffId: resolved.staffId, ...view }));
      } catch (err) {
        // 数据库未就绪时回退演示数据，不阻断药师工作台（与 pharmacyAuditLearning 一致）
        console.error(`[musePharma] GET /pharma [${c.traceId}] staff=${resolved.staffId}`, err);
        const view = demoPharmaMuse(resolved.staffId);
        return json(ok({ demo: true, staffId: resolved.staffId, ...view }));
      }
    },
  },
];
