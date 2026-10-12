/**
 * 健澜科技 jlmedaios - DIP repo（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

const db = getDb();

export interface PacketRow {
  id: string; packetCode: string; packetName: string; interventionCombo: string | null;
  score: number; version: string;
}

function mapPacket(r: Record<string, unknown>): PacketRow {
  return {
    id: String(r.id), packetCode: String(r.packet_code), packetName: String(r.packet_name),
    interventionCombo: r.intervention_combo == null ? null : String(r.intervention_combo),
    score: Number(r.score), version: String(r.version),
  };
}

export async function upsertPacketScore(input: { packetCode: string; packetName: string; interventionCombo?: string | null; score: number; version?: string }) {
  const rows = await db`
    INSERT INTO clinical.dip_packet_scores (packet_code, packet_name, intervention_combo, score, version)
    VALUES (${input.packetCode}, ${input.packetName}, ${input.interventionCombo ?? null}, ${input.score}, ${input.version ?? 'v1'})
    ON CONFLICT (packet_code, version) DO UPDATE SET score=EXCLUDED.score, packet_name=EXCLUDED.packet_name, intervention_combo=EXCLUDED.intervention_combo
    RETURNING id, packet_code, packet_name, intervention_combo, score, version`;
  return mapPacket(rows[0] as Record<string, unknown>);
}

export async function listPacketScores(): Promise<PacketRow[]> {
  const rows = await db`SELECT id, packet_code, packet_name, intervention_combo, score, version FROM clinical.dip_packet_scores ORDER BY packet_code`;
  return rows.map((r) => mapPacket(r as Record<string, unknown>));
}

export interface MonthlyPointRow {
  id: string; period: string; fundPool: number; totalScore: number; pointValue: number;
}

function mapPoint(r: Record<string, unknown>): MonthlyPointRow {
  return {
    id: String(r.id), period: String(r.period),
    fundPool: Number(r.fund_pool), totalScore: Number(r.total_score), pointValue: Number(r.point_value),
  };
}

export async function upsertMonthlyPoint(input: { period: string; fundPool: number; totalScore: number; pointValue: number }) {
  const rows = await db`
    INSERT INTO clinical.dip_monthly_points (period, fund_pool, total_score, point_value)
    VALUES (${input.period}, ${input.fundPool}, ${input.totalScore}, ${input.pointValue})
    ON CONFLICT (period) DO UPDATE SET fund_pool=EXCLUDED.fund_pool, total_score=EXCLUDED.total_score, point_value=EXCLUDED.point_value, computed_at=now()
    RETURNING id, period, fund_pool, total_score, point_value`;
  return mapPoint(rows[0] as Record<string, unknown>);
}

export async function getMonthlyPoint(period: string): Promise<MonthlyPointRow | null> {
  const rows = await db`SELECT id, period, fund_pool, total_score, point_value FROM clinical.dip_monthly_points WHERE period=${period}`;
  return rows.length > 0 ? mapPoint(rows[0] as Record<string, unknown>) : null;
}

export async function listMonthlyPoints(): Promise<MonthlyPointRow[]> {
  const rows = await db`SELECT id, period, fund_pool, total_score, point_value FROM clinical.dip_monthly_points ORDER BY period DESC`;
  return rows.map((r) => mapPoint(r as Record<string, unknown>));
}
