/**
 * 健澜科技 jlmedaios - 语音电子病历聚合器（M2-C）
 *
 * 闭环：
 *  1) 口述转写：医师对某次就诊发起口述，AsrService 转写 + 医疗后处理，
 *     原始/规范文本、术语纠正、用药剂量提及、风险提示落 voice_dictations（draft）；
 *  2) 复核转病历：口述医师本人复核/编辑规范文本，逐项确认用药剂量后，
 *     生成正式病历并本人签名（draft → signed），记录 resulting_record_id；
 *  3) 作废：口述医师本人可丢弃未复核会话（draft → discarded）。
 *
 * 安全与职责：
 *  - ASR 仅辅助：转写不直接入病历，必须经医师复核；剂量/频次只标记、不臆改；
 *  - 临床写操作本人签名：仅会话 owner（doctor_id）可转病历 / 作废，他人 403；
 *  - 引擎可插拔，离线为明确标注的本地演示引擎，不以演示冒充真实识别。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor, type Sql } from '../../db/pool.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type MedicalRecordType,
  createMedicalRecord,
  updateMedicalRecordStatus,
} from '../../db/repositories/medicalRecordRepo.js';
import {
  type AudioFormat,
  type VoiceDictation,
  createDictation,
  getDictationById,
  listDictations,
  markConverted,
  markDiscarded,
} from '../../db/repositories/voiceDictationRepo.js';
import { AsrService } from '../../voice/AsrService.js';
import { createAsrProviderFromEnv } from '../../voice/providers/createAsrProvider.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class VoiceMedicalError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VoiceMedicalError';
  }
}
const badRequest = (m: string) => new VoiceMedicalError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new VoiceMedicalError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new VoiceMedicalError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new VoiceMedicalError(409, 'CONFLICT', m);

/* ------------------------------ 依赖与范围 ------------------------------ */

let defaultAsr: AsrService | null = null;
/** 默认按环境构建 ASR 服务（真实提供方 / 本地演示），测试可注入自定义实例。 */
function resolveAsr(injected?: AsrService): AsrService {
  if (injected) return injected;
  if (!defaultAsr) defaultAsr = new AsrService(createAsrProviderFromEnv());
  return defaultAsr;
}

function canAccess(auth: AuthView, visit: Visit): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return visit.department === auth.deptName;
  }
  return visit.attendingDoctorId === auth.id;
}

function avgConfidence(segments: { confidence?: number }[]): number | null {
  const vals = segments.map((s) => s.confidence).filter((c): c is number => typeof c === 'number');
  if (vals.length === 0) return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
}

const VALID_RECORD_TYPES: MedicalRecordType[] = [
  'outpatient', 'admission', 'progress', 'operative', 'discharge', 'front_page',
];

/* ------------------------------ 口述转写 ------------------------------ */

export interface CreateDictationBody {
  visitId: string;
  audioRef: string;
  audioFormat?: AudioFormat;
}

export async function dictate(
  auth: AuthView,
  body: CreateDictationBody,
  injected?: AsrService,
): Promise<{ dictation: VoiceDictation }> {
  if (!body.visitId) throw badRequest('缺少 visitId');
  if (!body.audioRef || !String(body.audioRef).trim()) throw badRequest('缺少 audioRef');
  if (body.audioFormat && !['wav', 'mp3', 'm4a', 'pcm', 'ogg'].includes(body.audioFormat)) {
    throw badRequest('audioFormat 仅支持 wav/mp3/m4a/pcm/ogg');
  }

  const visit = await getVisitById(body.visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccess(auth, visit)) throw forbidden('不在您的数据范围内');

  const asr = resolveAsr(injected);
  const { transcription, postProcessed } = await asr.transcribe({
    audioRef: body.audioRef,
    audioFormat: body.audioFormat,
    locale: 'zh-CN',
    context: { patientId: visit.patientId, department: visit.department, doctorId: auth.id },
  });

  const dictation = await createDictation({
    visitId: visit.id,
    patientId: visit.patientId,
    doctorId: auth.id,
    audioRef: body.audioRef,
    audioFormat: body.audioFormat ?? null,
    durationMs: transcription.durationMs,
    asrProvider: transcription.provider,
    rawTranscript: transcription.fullText,
    normalizedText: postProcessed.text,
    segments: transcription.segments,
    corrections: postProcessed.corrections,
    medicationMentions: postProcessed.medicationMentions,
    // AsrService 已将 provider 风险提示合并进 postProcessed.warnings，直接使用避免重复
    warnings: postProcessed.warnings,
    avgConfidence: avgConfidence(transcription.segments),
  });

  await recordChainAudit({
    actorId: auth.id, actorName: auth.realName ?? auth.username,
    actorRole: auth.rawRoles.join(','), actorDept: visit.department,
    action: 'voice.dictate', resourceType: 'voice_dictation', resourceId: dictation.id,
    patientRef: visit.patientId, result: 'success', riskLevel: 'low',
    detail: { provider: transcription.provider, durationMs: transcription.durationMs },
  });

  return { dictation };
}

/* ------------------------------ 查询 ------------------------------ */

export async function getDictation(auth: AuthView, id: string): Promise<{ dictation: VoiceDictation }> {
  const dictation = await getDictationById(id);
  if (!dictation) throw notFound('语音口述会话不存在');
  if (dictation.doctorId !== auth.id && auth.dataScope !== 'all') {
    const visit = await getVisitById(dictation.visitId);
    if (!visit || !canAccess(auth, visit)) throw forbidden('不在您的数据范围内');
  }
  return { dictation };
}

export async function listMyDictations(
  auth: AuthView,
  filters: { visitId?: string; status?: VoiceDictation['status'] },
): Promise<{ items: VoiceDictation[]; total: number }> {
  // 非全院范围者仅能看本人会话；全院范围（医务科）可按就诊查看
  const items = await listDictations({
    visitId: filters.visitId,
    status: filters.status,
    ...(auth.dataScope === 'all' ? {} : { doctorId: auth.id }),
  });
  return { items, total: items.length };
}

/* ------------------------------ 复核转病历 ------------------------------ */

export interface ConvertDictationBody {
  /** 医师复核/编辑后的最终病历文本（必填、非空） */
  finalText: string;
  recordType?: MedicalRecordType;
  title?: string;
  /** 已逐项核对用药/剂量/频次（存在用药提及时必须为 true） */
  confirmMedications?: boolean;
}

export async function convert(
  auth: AuthView,
  id: string,
  body: ConvertDictationBody,
): Promise<{ dictation: VoiceDictation; recordId: string }> {
  const finalText = (body.finalText ?? '').trim();
  if (!finalText) throw badRequest('finalText 不能为空：病历须经医师复核确认');
  const recordType: MedicalRecordType = body.recordType ?? 'outpatient';
  if (!VALID_RECORD_TYPES.includes(recordType)) {
    throw badRequest(`recordType 非法，可选 ${VALID_RECORD_TYPES.join('/')}`);
  }

  const dictation = await getDictationById(id);
  if (!dictation) throw notFound('语音口述会话不存在');
  if (dictation.status !== 'draft') throw conflict('该会话已转换或已作废，无法重复转换');
  // 临床写操作本人签名：仅会话 owner 可转病历
  if (dictation.doctorId !== auth.id) {
    throw forbidden('仅口述医师本人可复核并将语音转为病历（本人签名）');
  }
  // 用药安全：存在剂量/频次提及时必须显式确认已逐项核对
  if (dictation.medicationMentions.length > 0 && body.confirmMedications !== true) {
    throw conflict('转写中存在用药/剂量/频次提及，请逐项核对并确认后再转病历');
  }

  const visit = await getVisitById(dictation.visitId);
  if (!visit) throw notFound('关联就诊不存在');
  if (!canAccess(auth, visit)) throw forbidden('不在您的数据范围内');

  return getDb().begin(async (tx: DbExecutor) => {
    const record = await createMedicalRecord(
      {
        visitId: dictation.visitId,
        recordType,
        title: (body.title ?? '').trim() || `语音病历·${visit.department}`,
        content: {
          source: 'voice_dictation',
          dictationId: dictation.id,
          asrProvider: dictation.asrProvider,
          rawTranscript: dictation.rawTranscript,
          finalText,
          corrections: dictation.corrections,
          medicationMentions: dictation.medicationMentions,
        },
        plainText: finalText,
        authorId: auth.id,
        aiGenerated: false,
      },
      // 事务句柄运行时支持全部查询方法，仅类型缺少客户端级方法，安全转换
      tx as unknown as Sql,
    );
    // 医师本人签名：draft → signed，signed_by 为本人
    const signed = await updateMedicalRecordStatus(
      record.id, 'signed', auth.id, tx as unknown as Sql,
    );
    if (!signed) throw conflict('病历签名失败：状态已变更');

    const updated = await markConverted(dictation.id, record.id, tx);
    if (!updated) throw conflict('语音会话状态已变更，转换未完成');

    await recordChainAudit({
      actorId: auth.id, actorName: auth.realName ?? auth.username,
      actorRole: auth.rawRoles.join(','), actorDept: visit.department,
      action: 'voice.convert', resourceType: 'medical_record', resourceId: record.id,
      patientRef: visit.patientId, result: 'success', riskLevel: 'medium',
      detail: { dictationId: dictation.id, recordType, medications: dictation.medicationMentions.length },
    }, tx);

    return { dictation: updated, recordId: record.id };
  });
}

/* ------------------------------ 作废 ------------------------------ */

export async function discard(
  auth: AuthView,
  id: string,
): Promise<{ dictation: VoiceDictation }> {
  const dictation = await getDictationById(id);
  if (!dictation) throw notFound('语音口述会话不存在');
  if (dictation.status !== 'draft') throw conflict('该会话已转换或已作废');
  if (dictation.doctorId !== auth.id) {
    throw forbidden('仅口述医师本人可作废该语音会话');
  }
  const updated = await markDiscarded(id);
  if (!updated) throw conflict('语音会话状态已变更，作废未完成');

  const visit = await getVisitById(dictation.visitId);
  await recordChainAudit({
    actorId: auth.id, actorName: auth.realName ?? auth.username,
    actorRole: auth.rawRoles.join(','), actorDept: visit?.department,
    action: 'voice.discard', resourceType: 'voice_dictation', resourceId: id,
    patientRef: visit?.patientId, result: 'success', riskLevel: 'low',
  });
  return { dictation: updated };
}
