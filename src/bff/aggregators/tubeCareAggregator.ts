/**
 * 健澜科技 jlmedaios - 管路护理聚合器（M17-C）
 *
 * 复用 inpatientCareAggregator.canAccessVisit（越权 403）。
 * 医疗安全：unplanned 拔管强制 removal_note；removed_by 为本人；recordChainAudit 留痕。
 * NQI_UNPLANNED_EXTUBATION 分子/分母由纯函数 computeUnplannedExtubationMetrics 计算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  insertTube,
  getTubeById,
  listTubes,
  insertAssessment,
  removeTube,
  listAllTubesForMetrics,
  type Tube,
} from '../../db/repositories/tubeCareRepo.js';
import {
  isHighRiskTube,
  requiresRemovalNote,
  computeUnplannedExtubationMetrics,
  type TubeType,
  type RemovalType,
  type SiteIntegrity,
} from '../../medical-tools/nursing/tubeCare.js';

export class TubeCareError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'TubeCareError';
  }
}
const badRequest = (m: string) => new TubeCareError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new TubeCareError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new TubeCareError(409, 'CONFLICT', m);
const forbidden = (m: string) => new TubeCareError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

// ---------------------------------------------------------------------------
// 置入管路
// ---------------------------------------------------------------------------

export async function insertTubeView(
  auth: AuthView,
  input: { visitId: string; tubeType: TubeType; site?: string; fixationNote?: string },
): Promise<Tube> {
  assertPermission(auth, 'tube_care:insert');
  assertUuid(input.visitId, '就诊');
  const visit = await loadVisit(auth, input.visitId);
  return withTx(async (tx) => {
    const tube = await insertTube(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        tubeType: input.tubeType,
        site: input.site ?? null,
        fixationNote: input.fixationNote ?? null,
        insertedBy: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'tube_care.insert',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: isHighRiskTube(input.tubeType) ? 'high' : 'low',
        detail: { tubeId: tube.id, tubeType: input.tubeType },
      },
      tx,
    );
    return tube;
  });
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

export async function listTubesView(auth: AuthView, filter: { visitId?: string; status?: string }) {
  assertPermission(auth, 'tube_care:read');
  if (process.env.DEMO_MODE === '1') {
    return [
      { id: 'demo-tube-1', patientName: '演示患者A', tubeType: '气管插管', site: '经口', status: 'in_place', insertedAt: '2026-10-18T08:00:00Z', days: 2 },
      { id: 'demo-tube-2', patientName: '演示患者B', tubeType: '中心静脉导管', site: '右颈内静脉', status: 'in_place', insertedAt: '2026-10-17T10:30:00Z', days: 3 },
      { id: 'demo-tube-3', patientName: '演示患者C', tubeType: '胃管', site: '经鼻', status: 'in_place', insertedAt: '2026-10-19T09:15:00Z', days: 0 },
      { id: 'demo-tube-4', patientName: '演示患者D', tubeType: '尿管', site: '留置', status: 'removed', insertedAt: '2026-10-15T14:00:00Z', removedAt: '2026-10-18T10:00:00Z', days: 3 },
      { id: 'demo-tube-5', patientName: '演示患者E', tubeType: '胸腔闭式引流管', site: '左侧胸腔', status: 'in_place', insertedAt: '2026-10-16T11:20:00Z', days: 4 },
      { id: 'demo-tube-6', patientName: '演示患者F', tubeType: '动脉测压管', site: '桡动脉', status: 'in_place', insertedAt: '2026-10-19T07:45:00Z', days: 0 },
    ];
  }
  return listTubes(filter);
}

export async function getTubeView(auth: AuthView, id: string) {
  assertPermission(auth, 'tube_care:read');
  assertUuid(id, '管路');
  const tube = await getTubeById(id);
  if (!tube) throw notFound('管路不存在');
  return tube;
}

// ---------------------------------------------------------------------------
// 每日评估
// ---------------------------------------------------------------------------

export async function assessTubeView(
  auth: AuthView,
  input: { tubeId: string; siteIntegrity: SiteIntegrity; fixationSecure: boolean; riskNote?: string },
) {
  assertPermission(auth, 'tube_care:insert');
  assertUuid(input.tubeId, '管路');
  const tube = await getTubeById(input.tubeId);
  if (!tube) throw notFound('管路不存在');
  await loadVisit(auth, tube.visitId);
  return withTx(async (tx) => {
    const a = await insertAssessment(
      {
        tubeId: tube.id,
        assessedBy: auth.id,
        siteIntegrity: input.siteIntegrity,
        fixationSecure: input.fixationSecure,
        riskNote: input.riskNote ?? null,
      },
      tx,
    );
    await recordChainAudit(
      { actorId: auth.id, action: 'tube_care.assess', resourceType: 'visit', resourceId: tube.visitId, result: 'success', riskLevel: isHighRiskTube(tube.tubeType) ? 'high' : 'low', detail: { tubeId: tube.id, siteIntegrity: input.siteIntegrity } },
      tx,
    );
    return a;
  });
}

// ---------------------------------------------------------------------------
// 拔管（CAS in_place -> removed；unplanned 必填 note）
// ---------------------------------------------------------------------------

export async function removeTubeView(
  auth: AuthView,
  id: string,
  input: { removalType: RemovalType; removalNote?: string },
): Promise<Tube> {
  assertPermission(auth, 'tube_care:remove');
  assertUuid(id, '管路');
  const tube = await getTubeById(id);
  if (!tube) throw notFound('管路不存在');
  await loadVisit(auth, tube.visitId);
  if (tube.status !== 'in_place') throw conflict(`管路状态为 ${tube.status}，不可重复拔管`);

  const note = (input.removalNote ?? '').trim();
  if (requiresRemovalNote(input.removalType) && !note) {
    throw badRequest('非计划拔管(unplanned)必须填写 removal_note（不良事件说明）');
  }

  return withTx(async (tx) => {
    const removed = await removeTube(tube.id, auth.id, input.removalType, note || null, tx);
    if (!removed) throw conflict('管路拔管失败（状态已变更）');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'tube_care.remove',
        resourceType: 'visit',
        resourceId: tube.visitId,
        result: 'success',
        riskLevel: input.removalType === 'unplanned' ? 'high' : 'low',
        detail: { tubeId: tube.id, removalType: input.removalType, removalNote: note || null },
      },
      tx,
    );
    return removed;
  });
}

// ---------------------------------------------------------------------------
// NQI_UNPLANNED_EXTUBATION
// ---------------------------------------------------------------------------

export async function getExtubationMetrics(auth: AuthView) {
  assertPermission(auth, 'tube_care:read');
  const rows = await listAllTubesForMetrics();
  const metrics = computeUnplannedExtubationMetrics(
    rows.map((r) => ({
      patientId: r.patientId,
      inPlace: r.status === 'in_place',
      unplanned: r.removalType === 'unplanned',
    })),
  );
  return { totalTubes: rows.length, metrics };
}
