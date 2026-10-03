/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引聚合器（M5-C）
 *
 * 闭环：
 *  - 标识登记（原始值经哈希后存储，仅留末四位）；
 *  - 扫描患者，确定性匹配引擎生成候选（不自动合并）；
 *  - 人工审核：确认 → 在事务内建立逻辑主从链接；拒绝 → 标记 rejected；
 *  - 候选/链接/标识查询。
 *
 * 红线：本切片只建立逻辑链接，不物理合并、不迁移外键；
 *  任一患者已存在链接时拒绝重复确认，避免链接冲突。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import {
  getPatientById,
  queryPatients,
  type Patient,
} from '../../db/repositories/patientRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { hashField } from '../../security/encryption/FieldCipher.js';
import {
  type EmpiLink,
  type MatchCandidate,
  type PatientIdentifier,
  type IdentifierDomain,
  getCandidateById,
  getLinkByPatient,
  insertCandidate,
  insertLink,
  listAllIdentifiers,
  listCandidates,
  listIdentifiersByPatient,
  listLinks,
  registerIdentifier,
  reviewCandidate,
} from '../../db/repositories/empiRepo.js';
import {
  type EmpiIdentifier,
  type EmpiPatient,
  scanCandidates,
} from '../../medical-tools/empi/empiMatcher.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class EmpiAggregatorError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EmpiAggregatorError';
  }
}
const badRequest = (m: string) => new EmpiAggregatorError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new EmpiAggregatorError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new EmpiAggregatorError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new EmpiAggregatorError(409, 'CONFLICT', m);

/* ------------------------------ 审计 ------------------------------ */

async function audit(
  auth: AuthView,
  action: string,
  resourceId: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await recordChainAudit({
    actorId: auth.id,
    actorName: auth.realName,
    actorRole: auth.rawRoles[0] ?? null,
    actorDept: auth.deptName,
    action,
    resourceType: 'empi',
    resourceId,
    result: 'success',
    detail,
  });
}

/* ------------------------------ 标识登记 ------------------------------ */

export interface RegisterIdentifierInput {
  patientId: string;
  domain: IdentifierDomain;
  rawValue: string;
  source?: string;
}

export async function registerPatientIdentifier(
  auth: AuthView,
  input: RegisterIdentifierInput,
): Promise<PatientIdentifier | null> {
  const raw = input.rawValue?.trim();
  if (!raw) throw badRequest('标识值不能为空');
  const patient = await getPatientById(input.patientId);
  if (!patient) throw notFound('患者不存在');

  const hash = hashField(raw);
  const last4 = raw.replace(/\s+/g, '').slice(-4);
  const created = await registerIdentifier({
    patientId: input.patientId,
    domain: input.domain,
    identifierHash: hash,
    identifierLast4: last4,
    source: input.source ?? 'local',
  });
  await audit(auth, 'empi.identifier_register', patient.id, {
    domain: input.domain,
    duplicated: created === null,
  });
  return created;
}

/* ------------------------------ 扫描候选 ------------------------------ */

export interface ScanSummary {
  scanned: number;
  newCandidates: number;
  pending: number;
}

function toEmpiPatient(p: Patient): EmpiPatient {
  return {
    id: p.id,
    mrn: p.mrn,
    nameMasked: p.nameMasked,
    gender: p.gender,
    birthDate: p.birthDate,
    idCardHash: p.idCardHash,
  };
}

export async function runEmpiScan(
  auth: AuthView,
): Promise<ScanSummary> {
  const patients = await queryPatients({ limit: 10000 });
  const allIdentifiers = await listAllIdentifiers();

  // 患者身份证哈希已在患者表；其它标识（手机/医保/微信）来自标识登记
  const idents: EmpiIdentifier[] = allIdentifiers
    .filter((i) => i.domain !== 'id_card' && i.domain !== 'mrn')
    .map((i) => ({
      patientId: i.patientId,
      domain: i.domain,
      identifierHash: i.identifierHash,
    }));

  const matches = scanCandidates(patients.map(toEmpiPatient), idents);

  let newCandidates = 0;
  for (const match of matches) {
    const created = await insertCandidate({
      patientAId: match.patientAId,
      patientBId: match.patientBId,
      matchScore: match.score,
      matchReasons: match.reasons,
    });
    if (created) newCandidates += 1;
  }

  const pending = await listCandidates({ status: 'pending' });
  await audit(auth, 'empi.scan', 'scan', {
    scanned: patients.length,
    newCandidates,
  });
  return {
    scanned: patients.length,
    newCandidates,
    pending: pending.length,
  };
}

/* ------------------------------ 审核候选 ------------------------------ */

/** 选择 master：创建时间更早的患者；相同则 id 字典序靠前。 */
function chooseMaster(a: Patient, b: Patient): { master: Patient; linked: Patient } {
  if (a.createdAt < b.createdAt) return { master: a, linked: b };
  if (b.createdAt < a.createdAt) return { master: b, linked: a };
  return a.id < b.id ? { master: a, linked: b } : { master: b, linked: a };
}

export async function confirmMatchCandidate(
  auth: AuthView,
  candidateId: string,
): Promise<EmpiLink> {
  return withTx(async (tx) => {
    const candidate = await getCandidateById(candidateId, tx);
    if (!candidate) throw notFound('候选不存在');
    if (candidate.status !== 'pending') {
      throw conflict('该候选已审核，不能重复确认');
    }

    const [pa, pb] = await Promise.all([
      getPatientById(candidate.patientAId, tx),
      getPatientById(candidate.patientBId, tx),
    ]);
    if (!pa || !pb) throw notFound('候选关联患者不存在');

    // 任一患者已存在链接（master 或 linked）→ 拒绝，避免链接冲突
    const linkA = await getLinkByPatient(pa.id, tx);
    const linkB = await getLinkByPatient(pb.id, tx);
    if (linkA || linkB) {
      throw conflict('其中患者已存在主索引链接，不能重复建立');
    }

    const { master, linked } = chooseMaster(pa, pb);
    const reviewed = await reviewCandidate(candidateId, 'confirmed', auth.id, tx);
    if (!reviewed) throw conflict('候选状态更新失败');

    const link = await insertLink(
      {
        masterPatientId: master.id,
        linkedPatientId: linked.id,
        candidateId,
        createdBy: auth.id,
      },
      tx,
    );
    if (!link) throw conflict('主索引链接建立失败');

    await audit(auth, 'empi.confirm', candidateId, {
      masterPatientId: master.id,
      linkedPatientId: linked.id,
    });
    return link;
  });
}

export async function rejectMatchCandidate(
  auth: AuthView,
  candidateId: string,
): Promise<MatchCandidate> {
  return withTx(async (tx) => {
    const candidate = await getCandidateById(candidateId, tx);
    if (!candidate) throw notFound('候选不存在');
    if (candidate.status !== 'pending') {
      throw conflict('该候选已审核，不能重复操作');
    }
    const reviewed = await reviewCandidate(candidateId, 'rejected', auth.id, tx);
    if (!reviewed) throw conflict('候选状态更新失败');
    await audit(auth, 'empi.reject', candidateId);
    return reviewed;
  });
}

/* ------------------------------ 查询 ------------------------------ */

export async function listMatchCandidates(
  auth: AuthView,
  options?: { status?: string },
): Promise<MatchCandidate[]> {
  return listCandidates(options?.status ? { status: options.status } : undefined);
}

export async function listEmpiLinks(
  auth: AuthView,
): Promise<EmpiLink[]> {
  return listLinks();
}

export async function getPatientIdentifiers(
  auth: AuthView,
  patientId: string,
): Promise<PatientIdentifier[]> {
  return listIdentifiersByPatient(patientId);
}
