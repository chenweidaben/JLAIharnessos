/**
 * 健澜科技数智医院智能体 - 语音口述会话 Repository
 * clinical.voice_dictations 表 CRUD（M2-C 语音电子病历）。
 *
 *  - createDictation：一次口述转写 + 医疗后处理结果落库（status=draft）；
 *  - getDictationById / listDictations：按就诊 / 口述医师 / 患者 / 状态查询；
 *  - markConverted：复核通过并转为正式病历（draft → converted，记 resulting_record_id）；
 *  - markDiscarded：作废（draft → discarded）。
 *
 * 状态流转的角色判定（仅 owner 本人可转病历 / 作废）由聚合器负责。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';
import type { TranscriptSegment } from '../../voice/types.js';

export type VoiceDictationStatus = 'draft' | 'converted' | 'discarded';
export type AudioFormat = 'wav' | 'mp3' | 'm4a' | 'pcm' | 'ogg';

/** 语音转写中的术语 / 书面语纠正 */
export interface VoiceTermCorrection {
  from: string;
  to: string;
  reason: string;
}
/** 用药 / 剂量 / 频次提及（安全关键，须医师逐项核对） */
export interface VoiceMedicationMention {
  raw: string;
  normalized?: string;
  reason: string;
}

export interface VoiceDictation {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  audioRef: string;
  audioFormat: AudioFormat | null;
  durationMs: number | null;
  asrProvider: string;
  rawTranscript: string;
  normalizedText: string;
  segments: TranscriptSegment[];
  corrections: VoiceTermCorrection[];
  medicationMentions: VoiceMedicationMention[];
  warnings: string[];
  avgConfidence: number | null;
  status: VoiceDictationStatus;
  resultingRecordId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceDictationCreateInput {
  visitId: string;
  patientId: string;
  doctorId: string;
  audioRef: string;
  audioFormat?: AudioFormat | null;
  durationMs?: number | null;
  asrProvider: string;
  rawTranscript: string;
  normalizedText: string;
  segments?: TranscriptSegment[];
  corrections?: VoiceTermCorrection[];
  medicationMentions?: VoiceMedicationMention[];
  warnings?: string[];
  avgConfidence?: number | null;
}

const SELECT_COLS = `id, visit_id, patient_id, doctor_id, audio_ref, audio_format, duration_ms,
  asr_provider, raw_transcript, normalized_text, segments, corrections, medication_mentions,
  warnings, avg_confidence, status, resulting_record_id, converted_at, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): VoiceDictation {
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    doctorId: String(row.doctor_id),
    audioRef: String(row.audio_ref),
    audioFormat: row.audio_format ? (row.audio_format as AudioFormat) : null,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
    asrProvider: String(row.asr_provider),
    rawTranscript: String(row.raw_transcript ?? ''),
    normalizedText: String(row.normalized_text ?? ''),
    segments: arr<TranscriptSegment>(row.segments),
    corrections: arr<VoiceTermCorrection>(row.corrections),
    medicationMentions: arr<VoiceMedicationMention>(row.medication_mentions),
    warnings: arr<string>(row.warnings).map((w) => String(w)),
    avgConfidence: row.avg_confidence != null ? Number(row.avg_confidence) : null,
    status: row.status as VoiceDictationStatus,
    resultingRecordId: row.resulting_record_id ? String(row.resulting_record_id) : null,
    convertedAt: row.converted_at ? String(row.converted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createDictation(
  input: VoiceDictationCreateInput,
  sql?: DbExecutor,
): Promise<VoiceDictation> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.voice_dictations (visit_id, patient_id, doctor_id, audio_ref,
      audio_format, duration_ms, asr_provider, raw_transcript, normalized_text,
      segments, corrections, medication_mentions, warnings, avg_confidence)
    VALUES (${input.visitId}, ${input.patientId}, ${input.doctorId}, ${input.audioRef},
      ${input.audioFormat ?? null}, ${input.durationMs ?? null}, ${input.asrProvider},
      ${input.rawTranscript}, ${input.normalizedText},
      ${db.json(toJson(input.segments ?? []))},
      ${db.json(toJson(input.corrections ?? []))},
      ${db.json(toJson(input.medicationMentions ?? []))},
      ${db.json(toJson(input.warnings ?? []))},
      ${input.avgConfidence ?? null})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getDictationById(
  id: string,
  sql?: DbExecutor,
): Promise<VoiceDictation | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)}
    FROM clinical.voice_dictations WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export interface ListDictationFilters {
  visitId?: string;
  doctorId?: string;
  patientId?: string;
  status?: VoiceDictationStatus;
  limit?: number;
}

export async function listDictations(
  filters: ListDictationFilters = {},
  sql?: DbExecutor,
): Promise<VoiceDictation[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder();
  if (filters.visitId) qb.where('visit_id = ?', filters.visitId);
  if (filters.doctorId) qb.where('doctor_id = ?', filters.doctorId);
  if (filters.patientId) qb.where('patient_id = ?', filters.patientId);
  if (filters.status) qb.where('status = ?', filters.status);
  const rows = await dynamicSelect<Record<string, unknown>>(
    db, SELECT_COLS, 'clinical.voice_dictations', qb, 'created_at DESC', filters.limit ?? 200,
  );
  return rows.map(mapRow);
}

/** 复核通过并转为正式病历：draft → converted（CAS，重复转换返回 null）。 */
export async function markConverted(
  id: string,
  resultingRecordId: string,
  sql?: DbExecutor,
): Promise<VoiceDictation | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.voice_dictations
    SET status = 'converted', resulting_record_id = ${resultingRecordId},
        converted_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'draft'
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 作废：draft → discarded（CAS，重复作废返回 null）。 */
export async function markDiscarded(
  id: string,
  sql?: DbExecutor,
): Promise<VoiceDictation | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.voice_dictations
    SET status = 'discarded', updated_at = now()
    WHERE id = ${id} AND status = 'draft'
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}
