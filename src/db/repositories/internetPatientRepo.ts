/**
 * 健澜科技 jlmedaios - 互联网医院患者 Repository（M3-J）
 *
 * 患者账号 / 就诊人 / 实名认证记录 / 医护线上资质 读写。
 * 并发：openid、id_card_hash 唯一约束；状态推进白名单 + 行锁。
 * 敏感字段加密存储，查询默认返回脱敏视图。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export interface PatientAccount {
  id: string;
  openid: string | null;
  unionid: string | null;
  channel: string;
  phoneEnc: string | null;
  phoneHash: string | null;
  status: 'active' | 'disabled' | 'logged_out';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  id: string;
  accountId: string;
  patientId: string | null;
  relation: 'self' | 'parent' | 'child' | 'spouse' | 'other';
  nameEnc: string | null;
  nameMasked: string | null;
  idCardEnc: string | null;
  idCardHash: string | null;
  gender: string | null;
  birthDate: string | null;
  authLevel: number;
  guardianId: string | null;
  isDefault: boolean;
  delegatedScopes: string[];
  delegationGrantedAt: string | null;
  delegationRevokedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RealnameRecord {
  id: string;
  profileId: string;
  verifyType: string;
  provider: string;
  status: 'pending' | 'passed' | 'failed';
  reason: string | null;
  traceId: string | null;
  createdAt: string;
}

export interface InternetPractitioner {
  id: string;
  userId: string;
  practitionerNo: string | null;
  practitionerType: 'doctor' | 'pharmacist' | 'nurse';
  practiceScope: string | null;
  practiceYears: number | null;
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

const ACCT_COLS = `
  id, openid, unionid, channel, phone_enc, phone_hash, status,
  last_login_at, created_at, updated_at
`;
const PROFILE_COLS = `
  id, account_id, patient_id, relation, name_enc, name_masked, id_card_enc,
  id_card_hash, gender, birth_date, auth_level, guardian_id, is_default,
  delegated_scopes, delegation_granted_at, delegation_revoked_at,
  verified_at, created_at, updated_at
`;
const PRACT_COLS = `
  id, user_id, practitioner_no, practitioner_type, practice_scope,
  practice_years, audit_status, audit_reason, approved_at, approved_by,
  valid_from, valid_to, created_at, updated_at
`;

function mapAccount(r: Record<string, unknown>): PatientAccount {
  return {
    id: String(r.id),
    openid: r.openid ? String(r.openid) : null,
    unionid: r.unionid ? String(r.unionid) : null,
    channel: String(r.channel),
    phoneEnc: r.phone_enc ? String(r.phone_enc) : null,
    phoneHash: r.phone_hash ? String(r.phone_hash) : null,
    status: r.status as PatientAccount['status'],
    lastLoginAt: r.last_login_at ? String(r.last_login_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/**
 * 解析 jsonb 数组：postgres.js 通常自动解析，但新建列/类型缓存
 * 未命中时可能返回字符串，这里统一兜底，保证返回 string[]。
 */
function parseJsonbArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapProfile(r: Record<string, unknown>): PatientProfile {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    patientId: r.patient_id ? String(r.patient_id) : null,
    relation: r.relation as PatientProfile['relation'],
    nameEnc: r.name_enc ? String(r.name_enc) : null,
    nameMasked: r.name_masked ? String(r.name_masked) : null,
    idCardEnc: r.id_card_enc ? String(r.id_card_enc) : null,
    idCardHash: r.id_card_hash ? String(r.id_card_hash) : null,
    gender: r.gender ? String(r.gender) : null,
    birthDate: r.birth_date ? String(r.birth_date) : null,
    authLevel: Number(r.auth_level),
    guardianId: r.guardian_id ? String(r.guardian_id) : null,
    isDefault: Boolean(r.is_default),
    delegatedScopes: parseJsonbArray(r.delegated_scopes),
    delegationGrantedAt: r.delegation_granted_at ? String(r.delegation_granted_at) : null,
    delegationRevokedAt: r.delegation_revoked_at ? String(r.delegation_revoked_at) : null,
    verifiedAt: r.verified_at ? String(r.verified_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapPractitioner(r: Record<string, unknown>): InternetPractitioner {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    practitionerNo: r.practitioner_no ? String(r.practitioner_no) : null,
    practitionerType: r.practitioner_type as InternetPractitioner['practitionerType'],
    practiceScope: r.practice_scope ? String(r.practice_scope) : null,
    practiceYears: r.practice_years != null ? Number(r.practice_years) : null,
    auditStatus: r.audit_status as InternetPractitioner['auditStatus'],
    auditReason: r.audit_reason ? String(r.audit_reason) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    validFrom: r.valid_from ? String(r.valid_from) : null,
    validTo: r.valid_to ? String(r.valid_to) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/* ------------------------------------------------------------------ */
/* 患者账号                                                            */
/* ------------------------------------------------------------------ */

/** 按 openid 查找账号 */
export async function getAccountByOpenid(openid: string, db?: DbExecutor): Promise<PatientAccount | null> {
  const ex = db ?? getDb();
  const rows = await ex`SELECT ${ex.unsafe(ACCT_COLS)} FROM clinical.patient_accounts WHERE openid = ${openid}`;
  return rows.length > 0 ? mapAccount(rows[0] as Record<string, unknown>) : null;
}

/** 按手机号哈希查找账号 */
export async function getAccountByPhoneHash(phoneHash: string, db?: DbExecutor): Promise<PatientAccount | null> {
  const ex = db ?? getDb();
  const rows = await ex`SELECT ${ex.unsafe(ACCT_COLS)} FROM clinical.patient_accounts WHERE phone_hash = ${phoneHash}`;
  return rows.length > 0 ? mapAccount(rows[0] as Record<string, unknown>) : null;
}

/** 创建患者账号（幂等：openid 已存在则回查） */
export async function createAccount(input: {
  openid?: string | null;
  unionid?: string | null;
  channel?: string;
  phoneEnc?: string | null;
  phoneHash?: string | null;
}, tx: DbExecutor): Promise<{ account: PatientAccount; created: boolean }> {
  if (input.openid) {
    const existing = await getAccountByOpenid(input.openid, tx);
    if (existing) return { account: existing, created: false };
  }
  if (input.phoneHash) {
    const existing = await getAccountByPhoneHash(input.phoneHash, tx);
    if (existing) return { account: existing, created: false };
  }
  const rows = await tx`
    INSERT INTO clinical.patient_accounts (openid, unionid, channel, phone_enc, phone_hash)
    VALUES (${input.openid ?? null}, ${input.unionid ?? null}, ${input.channel ?? 'wechat'},
            ${input.phoneEnc ?? null}, ${input.phoneHash ?? null})
    RETURNING ${tx.unsafe(ACCT_COLS)}
  `;
  return { account: mapAccount(rows[0] as Record<string, unknown>), created: true };
}

/** 更新登录时间/状态 */
export async function touchAccount(id: string, tx: DbExecutor, ip?: string): Promise<void> {
  await tx`
    UPDATE clinical.patient_accounts
       SET last_login_at = now(), last_login_ip = ${ip ?? null}, status = 'active'
     WHERE id = ${id}
  `;
}

/** 绑定手机号（加密 + 哈希） */
export async function bindPhoneToAccount(
  id: string,
  phoneEnc: string,
  phoneHash: string,
  tx: DbExecutor,
): Promise<void> {
  await tx`
    UPDATE clinical.patient_accounts
       SET phone_enc = ${phoneEnc}, phone_hash = ${phoneHash}
     WHERE id = ${id}
  `;
}

/* ------------------------------------------------------------------ */
/* 就诊人                                                              */
/* ------------------------------------------------------------------ */

/** 列出账号下全部就诊人 */
export async function listProfiles(accountId: string, db?: DbExecutor): Promise<PatientProfile[]> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(PROFILE_COLS)} FROM clinical.patient_profiles
     WHERE account_id = ${accountId}
     ORDER BY is_default DESC, created_at ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapProfile);
}

/** 按 id 查找就诊人 */
export async function getProfileById(id: string, db?: DbExecutor): Promise<PatientProfile | null> {
  const ex = db ?? getDb();
  const rows = await ex`SELECT ${ex.unsafe(PROFILE_COLS)} FROM clinical.patient_profiles WHERE id = ${id}`;
  return rows.length > 0 ? mapProfile(rows[0] as Record<string, unknown>) : null;
}

/** 按 id 查找就诊人并加行锁 */
export async function lockProfile(id: string, tx: DbExecutor): Promise<PatientProfile | null> {
  const rows = await tx`SELECT ${tx.unsafe(PROFILE_COLS)} FROM clinical.patient_profiles WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapProfile(rows[0] as Record<string, unknown>) : null;
}

/** 按身份证哈希查找就诊人（用于 EMPI 去重） */
export async function getProfileByIdCardHash(idCardHash: string, db?: DbExecutor): Promise<PatientProfile | null> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(PROFILE_COLS)} FROM clinical.patient_profiles
     WHERE id_card_hash = ${idCardHash}
     LIMIT 1
  `;
  return rows.length > 0 ? mapProfile(rows[0] as Record<string, unknown>) : null;
}

/** 创建就诊人 */
export async function createProfile(input: {
  accountId: string;
  relation: PatientProfile['relation'];
  nameEnc?: string | null;
  nameMasked?: string | null;
  idCardEnc?: string | null;
  idCardHash?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  authLevel?: number;
  guardianId?: string | null;
  isDefault?: boolean;
}, tx: DbExecutor): Promise<PatientProfile> {
  const rows = await tx`
    INSERT INTO clinical.patient_profiles (
      account_id, relation, name_enc, name_masked, id_card_enc, id_card_hash,
      gender, birth_date, auth_level, guardian_id, is_default
    ) VALUES (
      ${input.accountId}, ${input.relation}, ${input.nameEnc ?? null},
      ${input.nameMasked ?? null}, ${input.idCardEnc ?? null}, ${input.idCardHash ?? null},
      ${input.gender ?? null}, ${input.birthDate ?? null}, ${input.authLevel ?? 1},
      ${input.guardianId ?? null}, ${input.isDefault ?? false}
    )
    RETURNING ${tx.unsafe(PROFILE_COLS)}
  `;
  return mapProfile(rows[0] as Record<string, unknown>);
}

/** 行级更新就诊人（认证等级、EMPI 绑定、监护人等） */
export async function patchProfile(id: string, patch: Record<string, unknown>, tx: DbExecutor): Promise<PatientProfile> {
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const rows = await tx.unsafe(
    `UPDATE clinical.patient_profiles SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PROFILE_COLS}`,
    [id, ...keys.map((k) => patch[k])],
  );
  return mapProfile(rows[0] as Record<string, unknown>);
}

/* ------------------------------------------------------------------ */
/* 实名认证记录                                                         */
/* ------------------------------------------------------------------ */

export async function insertRealnameRecord(input: {
  profileId: string;
  verifyType: string;
  provider: string;
  status: 'pending' | 'passed' | 'failed';
  reason?: string | null;
  traceId?: string | null;
}, tx: DbExecutor): Promise<RealnameRecord> {
  const rows = await tx`
    INSERT INTO clinical.realname_verifications (
      profile_id, verify_type, provider, status, reason, trace_id
    ) VALUES (
      ${input.profileId}, ${input.verifyType}, ${input.provider},
      ${input.status}, ${input.reason ?? null}, ${input.traceId ?? null}
    )
    RETURNING id, profile_id, verify_type, provider, status, reason, trace_id, created_at
  `;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: String(r.id),
    profileId: String(r.profile_id),
    verifyType: String(r.verify_type),
    provider: String(r.provider),
    status: r.status as RealnameRecord['status'],
    reason: r.reason ? String(r.reason) : null,
    traceId: r.trace_id ? String(r.trace_id) : null,
    createdAt: String(r.created_at),
  };
}

/* ------------------------------------------------------------------ */
/* 医护线上资质                                                         */
/* ------------------------------------------------------------------ */

/** 获取互联网患者序号（新患者 MRN 派生，事务内并发安全） */
export async function nextInternetPatientNo(tx: DbExecutor): Promise<string> {
  const rows = await tx`SELECT nextval('clinical.internet_patient_no_seq')::bigint AS n`;
  return `IPAT${String(rows[0].n).padStart(8, '0')}`;
}

/** 按用户查找线上资质 */
export async function getPractitionerByUserId(userId: string, db?: DbExecutor): Promise<InternetPractitioner | null> {
  const ex = db ?? getDb();
  const rows = await ex`SELECT ${ex.unsafe(PRACT_COLS)} FROM iam.internet_practitioners WHERE user_id = ${userId}`;
  return rows.length > 0 ? mapPractitioner(rows[0] as Record<string, unknown>) : null;
}

/** 列出线上资质（可按审核状态过滤） */
export async function listPractitioners(status?: string, db?: DbExecutor): Promise<InternetPractitioner[]> {
  const ex = db ?? getDb();
  const rows = status
    ? await ex`SELECT ${ex.unsafe(PRACT_COLS)} FROM iam.internet_practitioners WHERE audit_status = ${status} ORDER BY created_at DESC`
    : await ex`SELECT ${ex.unsafe(PRACT_COLS)} FROM iam.internet_practitioners ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapPractitioner);
}

/** 行锁查找线上资质 */
export async function lockPractitioner(id: string, tx: DbExecutor): Promise<InternetPractitioner | null> {
  const rows = await tx`SELECT ${tx.unsafe(PRACT_COLS)} FROM iam.internet_practitioners WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapPractitioner(rows[0] as Record<string, unknown>) : null;
}

/** 提交线上资质申请（幂等：用户已有申请则回查） */
export async function upsertPractitioner(input: {
  userId: string;
  practitionerNo?: string | null;
  practitionerType: InternetPractitioner['practitionerType'];
  practiceScope?: string | null;
  practiceYears?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
}, tx: DbExecutor): Promise<{ practitioner: InternetPractitioner; created: boolean }> {
  const existing = await getPractitionerByUserId(input.userId, tx);
  if (existing) {
    // 被驳回后重新提交：重置为待审核，清空上一轮驳回/审核字段
    if (existing.auditStatus === 'rejected') {
      const rows = await tx`
        UPDATE iam.internet_practitioners
           SET practitioner_no = ${input.practitionerNo ?? null},
               practitioner_type = ${input.practitionerType},
               practice_scope = ${input.practiceScope ?? null},
               practice_years = ${input.practiceYears ?? null},
               valid_from = ${input.validFrom ?? null},
               valid_to = ${input.validTo ?? null},
               audit_status = 'pending',
               audit_reason = null,
               approved_at = null,
               approved_by = null
         WHERE id = ${existing.id}
        RETURNING ${tx.unsafe(PRACT_COLS)}
      `;
      return { practitioner: mapPractitioner(rows[0] as Record<string, unknown>), created: false };
    }
    const keys = ['practitioner_no', 'practitioner_type', 'practice_scope', 'practice_years', 'valid_from', 'valid_to'];
    const sets = keys.map((k, i) => `${k} = $${i + 2}`);
    const rows = await tx.unsafe(
      `UPDATE iam.internet_practitioners SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PRACT_COLS}`,
      [existing.id, input.practitionerNo ?? null, input.practitionerType, input.practiceScope ?? null,
       input.practiceYears ?? null, input.validFrom ?? null, input.validTo ?? null],
    );
    return { practitioner: mapPractitioner(rows[0] as Record<string, unknown>), created: false };
  }
  const rows = await tx`
    INSERT INTO iam.internet_practitioners (
      user_id, practitioner_no, practitioner_type, practice_scope,
      practice_years, valid_from, valid_to
    ) VALUES (
      ${input.userId}, ${input.practitionerNo ?? null}, ${input.practitionerType},
      ${input.practiceScope ?? null}, ${input.practiceYears ?? null},
      ${input.validFrom ?? null}, ${input.validTo ?? null}
    )
    RETURNING ${tx.unsafe(PRACT_COLS)}
  `;
  return { practitioner: mapPractitioner(rows[0] as Record<string, unknown>), created: true };
}

/** 审核线上资质（pending -> approved/rejected） */
export async function reviewPractitioner(
  id: string,
  decision: 'approved' | 'rejected',
  reason: string | null,
  auditorId: string,
  tx: DbExecutor,
): Promise<InternetPractitioner> {
  const rows = await tx`
    UPDATE iam.internet_practitioners
       SET audit_status = ${decision},
           audit_reason = ${reason},
           approved_at = ${decision === 'approved' ? new Date() : null},
           approved_by = ${decision === 'approved' ? auditorId : null}
     WHERE id = ${id}
    RETURNING ${tx.unsafe(PRACT_COLS)}
  `;
  return mapPractitioner(rows[0] as Record<string, unknown>);
}
