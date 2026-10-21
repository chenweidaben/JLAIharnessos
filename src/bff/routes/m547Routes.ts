/**
 * 健澜科技 jlmedaios - M547 新标准 P1：电子病历五级三级查房记录闭环 GET+POST
 *
 * GET  /api/v1/rounds?visitId=    按 roundDate 倒序；visitId 过滤
 * POST /api/v1/rounds             新建查房记录（时间递进状态机，越级/重复/倒退 → 409）
 *
 * 状态机：ward（住院医师）→ residents（主治医师）→ attending（主任医师）逐级递进。
 *   - 跳级（无 ward 直接 residents，或无 ward/residents 直接 attending）→ 409 round_level_skipped
 *   - 重复提交同一级别 → 409 round_level_duplicate
 *   - residents.roundDate ≤ ward.roundDate → 409 ward_round_not_before_residents
 *   - attending.roundDate ≤ residents.roundDate → 409 residents_round_not_before_attending
 *   - 首次 ward 无前置校验
 *
 * 种子：V2026102101 完整三级链 ward(10-19 08:00) → residents(10-20 09:00) → attending(10-21 10:00)。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type RoundLevel = 'ward' | 'residents' | 'attending';

interface RoundRecord {
  id: string;
  visitId: string;
  roundLevel: RoundLevel;
  roundDate: string;
  chiefComplaint: string;
  currentStatus: string;
  analysis: string;
  plan: string;
  attendingDoctorId: string;
  attendingDoctorName: string;
  createdAt: string;
}

// ============================== 内存态查房库（DEMO 短路） ==============================

const rounds: RoundRecord[] = [];
let roundSeq = 0;

function addRound(r: Omit<RoundRecord, 'id' | 'createdAt'>): RoundRecord {
  roundSeq += 1;
  const rec: RoundRecord = { ...r, id: `ROUND-${String(roundSeq).padStart(3, '0')}`, createdAt: new Date().toISOString() };
  rounds.push(rec);
  return rec;
}

function seedRounds(): void {
  addRound({ visitId: 'V2026102101', roundLevel: 'ward', roundDate: '2026-10-19T08:00:00+08:00', chiefComplaint: '反复头晕 1 周', currentStatus: '血压 165/102 mmHg', analysis: '高血压待查，需排除继发性因素', plan: '监测血压，完善动态心电图', attendingDoctorId: 'E-W001', attendingDoctorName: '王医师' });
  addRound({ visitId: 'V2026102101', roundLevel: 'residents', roundDate: '2026-10-20T09:00:00+08:00', chiefComplaint: '反复头晕 1 周', currentStatus: '血压 148/92 mmHg', analysis: '原发性高血压 2 级，CCB 治疗有效', plan: '继续氨氯地平，加阿托伐他汀调脂', attendingDoctorId: 'E-R001', attendingDoctorName: '李主治医师' });
  addRound({ visitId: 'V2026102101', roundLevel: 'attending', roundDate: '2026-10-21T10:00:00+08:00', chiefComplaint: '反复头晕 1 周', currentStatus: '血压 132/82 mmHg', analysis: '诊断明确，治疗方案合理', plan: '明日出院，带药随访 2 周', attendingDoctorId: 'E-A001', attendingDoctorName: '陈主任医师' });
}
seedRounds();

const LEVEL_ORDER: RoundLevel[] = ['ward', 'residents', 'attending'];

// ============================== 1. GET /api/v1/rounds?visitId= ==============================

async function handleRoundList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let rows = rounds.slice();
  if (visitId) rows = rows.filter((r) => r.visitId === visitId);
  rows = rows.sort((a, b) => b.roundDate.localeCompare(a.roundDate));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/rounds ==============================

async function handleRoundCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const visitId = body.visitId;
  const roundLevel = body.roundLevel;
  const roundDate = body.roundDate;
  const chiefComplaint = body.chiefComplaint;
  const currentStatus = body.currentStatus;
  const analysis = body.analysis;
  const plan = body.plan;
  const attendingDoctorId = body.attendingDoctorId;
  const attendingDoctorName = body.attendingDoctorName;

  if (
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof roundLevel !== 'string' || !LEVEL_ORDER.includes(roundLevel as RoundLevel) ||
    typeof roundDate !== 'string' || !roundDate.trim() || Number.isNaN(Date.parse(roundDate)) ||
    typeof chiefComplaint !== 'string' || !chiefComplaint.trim() ||
    typeof currentStatus !== 'string' || !currentStatus.trim() ||
    typeof analysis !== 'string' || !analysis.trim() ||
    typeof plan !== 'string' || !plan.trim() ||
    typeof attendingDoctorId !== 'string' || !attendingDoctorId.trim() ||
    typeof attendingDoctorName !== 'string' || !attendingDoctorName.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const level = roundLevel as RoundLevel;
  const levelIdx = LEVEL_ORDER.indexOf(level);
  const visitRounds = rounds.filter((r) => r.visitId === visitId);

  // 状态机校验
  const existingLevelIdx = LEVEL_ORDER.map((lv, i) => (visitRounds.some((r) => r.roundLevel === lv) ? i : -1))
    .filter((i) => i >= 0);
  const maxExistingIdx = existingLevelIdx.length ? Math.max(...existingLevelIdx) : -1;

  // 重复提交同一级别
  if (visitRounds.some((r) => r.roundLevel === level)) {
    return json({ code: 409, message: 'round_level_duplicate' }, 409);
  }
  // 跳级：新级别必须恰好是 maxExistingIdx+1（首个必须是 ward）
  if (levelIdx !== maxExistingIdx + 1) {
    return json({ code: 409, message: 'round_level_skipped' }, 409);
  }
  // 时间递进：新 roundDate 必须 > 上一级别的 roundDate
  if (maxExistingIdx >= 0) {
    const prevLevel = LEVEL_ORDER[maxExistingIdx];
    const prevRound = visitRounds.find((r) => r.roundLevel === prevLevel);
    if (prevRound && Date.parse(roundDate) <= Date.parse(prevRound.roundDate)) {
      if (level === 'residents') return json({ code: 409, message: 'ward_round_not_before_residents' }, 409);
      if (level === 'attending') return json({ code: 409, message: 'residents_round_not_before_attending' }, 409);
    }
  }

  const rec = addRound({
    visitId: visitId.trim(),
    roundLevel: level,
    roundDate,
    chiefComplaint: chiefComplaint.trim(),
    currentStatus: currentStatus.trim(),
    analysis: analysis.trim(),
    plan: plan.trim(),
    attendingDoctorId: attendingDoctorId.trim(),
    attendingDoctorName: attendingDoctorName.trim(),
  });
  return json(ok(rec), 200);
}

export const m547Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/rounds', handle: handleRoundList, auth: true },
  { method: 'POST', path: '/api/v1/rounds', handle: handleRoundCreate, auth: true },
];
