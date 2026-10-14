/**
 * 健澜科技 jlmedaios - 临床路径变异管理聚合器（213）
 *
 * 就诊级变异登记与变异率统计：
 *  - varianceRate 为纯函数（变异例数/总入径例数），无 I/O、无除零；
 *  - listView：变异原因列表 + 变异率统计卡数据；
 *  - recordView：就诊级变异原因登记（追加写，落哈希链审计）。
 *
 * 权限码：优先使用 pathway:variance；该码当前未在 iam.permissions 下发，
 * 按约定回退复用既有临床路径查看码 pathway:read（严禁新增/改动权限码种子）。
 *
 * 医疗安全：变异登记仅为记录与质控辅助，不替代医师判断、不驱动任何自动医嘱。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { PathwayError } from './pathwayAggregator.js';
import {
  createVariance,
  listVariances,
  countVariedVisits,
  hasVarianceForVisit,
  countEnrollments,
  countEnrollmentsByVisit,
  type PathwayVariance,
} from '../../db/repositories/pathwayVarianceRepo.js';

const badRequest = (m: string) => new PathwayError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new PathwayError(403, 'FORBIDDEN', m);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

/**
 * 权限码：pathway:variance 未在 96-pathway.sql 下发，回退复用既有查看码
 * pathway:read（admin/doctor/nurse/technician/pharmacist 均已授予）。
 */
const VARIANCE_PERM = 'pathway:read';

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

/** 允许的变异类型（前端下拉同口径）；自由文本写入时非空即可。 */
const VARIANCE_TYPES = new Set(['positive', 'negative', 'neutral']);

// ---------------------------------------------------------------------------
// 纯函数：变异率
// ---------------------------------------------------------------------------

export interface VarianceRateInput {
  /** 变异例数（发生过变异的入径例数，分子） */
  variedCount: number;
  /** 总入径例数（分母） */
  enrolledCount: number;
}

/**
 * 临床路径变异率 = 变异例数 / 总入径例数。
 *
 * 纯函数、确定性、无 I/O：
 *  - 入参为空/空数组/分母合计为 0 时返回 0，绝不抛除零错误；
 *  - 非有限数、负数按 0 计入；多条记录先合计分子分母再相除（整体口径）。
 */
export function varianceRate(records: VarianceRateInput[] | null | undefined): number {
  let varied = 0;
  let enrolled = 0;
  for (const r of records ?? []) {
    if (!r) continue;
    const v = Number(r.variedCount);
    const e = Number(r.enrolledCount);
    if (Number.isFinite(v) && v > 0) varied += v;
    if (Number.isFinite(e) && e > 0) enrolled += e;
  }
  if (enrolled === 0) return 0;
  return varied / enrolled;
}

// ---------------------------------------------------------------------------
// 列表 / 统计
// ---------------------------------------------------------------------------

export interface VarianceListResult {
  records: PathwayVariance[];
  /** 变异率（0~1，纯函数 varianceRate 计算） */
  varianceRate: number;
  /** 变异例数（分子） */
  variedCount: number;
  /** 总入径例数（分母） */
  enrolledCount: number;
}

export async function listView(
  auth: AuthView,
  filter: { visitId?: string },
): Promise<VarianceListResult> {
  assertPermission(auth, VARIANCE_PERM);
  const visitId = filter.visitId?.trim() || undefined;
  if (visitId) assertUuid(visitId, '就诊');

  const records = await listVariances({ visitId });

  // 统计口径：指定就诊时按该就诊算；否则全院整体口径
  let variedCount: number;
  let enrolledCount: number;
  if (visitId) {
    variedCount = (await hasVarianceForVisit(visitId)) ? 1 : 0;
    enrolledCount = await countEnrollmentsByVisit(visitId);
  } else {
    variedCount = await countVariedVisits();
    enrolledCount = await countEnrollments();
  }

  return {
    records,
    variedCount,
    enrolledCount,
    varianceRate: varianceRate([{ variedCount, enrolledCount }]),
  };
}

// ---------------------------------------------------------------------------
// 登记
// ---------------------------------------------------------------------------

export interface RecordVarianceInput {
  visitId: string;
  reason: string;
  varianceType?: string;
  pathwayId?: string | null;
}

export async function recordView(
  auth: AuthView,
  input: RecordVarianceInput,
): Promise<PathwayVariance> {
  assertPermission(auth, VARIANCE_PERM);
  assertUuid(input.visitId, '就诊');
  if (!input.reason || !input.reason.trim()) throw badRequest('变异原因不能为空');
  const varianceType = (input.varianceType ?? 'neutral').trim() || 'neutral';
  if (!VARIANCE_TYPES.has(varianceType)) {
    throw badRequest('变异类型须为 positive / negative / neutral');
  }
  if (input.pathwayId) assertUuid(input.pathwayId, '路径');

  const reason = input.reason.trim();

  return withTx(async (tx) => {
    const created = await createVariance(
      {
        visitId: input.visitId.trim(),
        reason,
        varianceType,
        pathwayId: input.pathwayId?.trim() || null,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.variance.record',
        resourceType: 'pathway_variance',
        resourceId: created.id,
        result: 'success',
        riskLevel: varianceType === 'negative' ? 'medium' : 'low',
        detail: { visitId: created.visitId, varianceType, reason },
      },
      tx,
    );
    return created;
  });
}
