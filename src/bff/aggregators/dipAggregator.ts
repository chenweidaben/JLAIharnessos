/**
 * 健澜科技 jlmedaios - DIP 聚合器（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  getMonthlyPoint,
  listMonthlyPoints,
  listPacketScores,
  upsertMonthlyPoint,
  upsertPacketScore,
} from '../../db/repositories/dipRepo.js';
import { computePointValue, settleAmount } from '../../medical-tools/operations/dipPoint.js';

export class DipError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'DipError';
  }
}
const badRequest = (m: string) => new DipError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new DipError(403, 'FORBIDDEN', m);

function assertManage(auth: AuthView): void {
  if (!auth.permissions.includes('dip:manage')) throw forbidden('缺少权限：dip:manage');
}
function assertView(auth: AuthView): void {
  if (!auth.permissions.includes('dip:view')) throw forbidden('缺少权限：dip:view');
}

export async function listPacketsView(auth: AuthView) {
  assertView(auth);
  return listPacketScores();
}

export async function createPacketView(auth: AuthView, input: { packetCode: string; packetName: string; interventionCombo?: string | null; score: number; version?: string }) {
  assertManage(auth);
  if (!input.packetCode || input.score <= 0) throw badRequest('packetCode 必填且 score>0');
  const r = await upsertPacketScore(input);
  await recordChainAudit({ actorId: auth.id, action: 'dip.packet.upsert', resourceType: 'dip_packet_scores', resourceId: r.id, result: 'success', riskLevel: 'low', detail: { packetCode: r.packetCode } });
  return r;
}

export async function listPointsView(auth: AuthView) {
  assertView(auth);
  return listMonthlyPoints();
}

export async function calculatePointView(auth: AuthView, input: { period: string; fundPool: number; totalScore: number }) {
  assertManage(auth);
  if (!/^[0-9]{4}-[0-9]{2}$/.test(input.period)) throw badRequest('period 格式应为 YYYY-MM');
  const pointValue = computePointValue(input.fundPool, input.totalScore);
  const r = await upsertMonthlyPoint({ period: input.period, fundPool: input.fundPool, totalScore: input.totalScore, pointValue });
  await recordChainAudit({ actorId: auth.id, action: 'dip.point.calculate', resourceType: 'dip_monthly_points', resourceId: r.id, result: 'success', riskLevel: 'low', detail: { period: input.period, pointValue } });
  return r;
}

export async function settleView(auth: AuthView, input: { packetCode: string; period: string }) {
  assertView(auth);
  const packets = await listPacketScores();
  const pkt = packets.find((p) => p.packetCode === input.packetCode);
  if (!pkt) throw badRequest('病种分值未找到');
  const mp = await getMonthlyPoint(input.period);
  if (!mp) throw badRequest('该月点值尚未计算');
  return { packetCode: pkt.packetCode, score: pkt.score, period: mp.period, pointValue: mp.pointValue, settleAmount: settleAmount(pkt.score, mp.pointValue) };
}
