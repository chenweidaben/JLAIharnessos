/**
 * 健澜科技 jlmedaios - 互联网医院患者聚合器（M3-J）
 *
 * 微信登录注册 -> 就诊人 -> 实名认证 -> EMPI 绑定/创建；
 * 医护线上资质提交与审核。
 *
 * 安全：患者仅能访问本人账号下的就诊人；实名认证须本人，
 * AI 仅辅助、不自动建患者以外的医疗写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type TransactionSql, withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  createPatient,
  getPatientByIdCardHash,
  type Patient,
} from '../../db/repositories/patientRepo.js';
import {
  bindPhoneToAccount,
  createAccount,
  createProfile,
  getProfileById,
  insertRealnameRecord,
  listProfiles as listProfilesRepo,
  lockProfile,
  nextInternetPatientNo,
  patchProfile,
  touchAccount,
  upsertPractitioner,
  listPractitioners as listPractitionersRepo,
  lockPractitioner,
  reviewPractitioner,
  type InternetPractitioner,
} from '../../db/repositories/internetPatientRepo.js';
import { type PatientProfile } from '../../db/repositories/internetPatientRepo.js';
import {
  birthDateFromIdCard,
  encryptField,
  genderFromIdCard,
  hashField,
} from '../../security/encryption/FieldCipher.js';
import { signJwt } from '../middleware/auth.js';
import { maskName } from '../adapters/desensitize.js';
import { getRealnameProvider } from '../../internet-hospital/realname/index.js';
import { getWechatLoginProvider } from '../../internet-hospital/wechat/index.js';

export class InternetPatientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InternetPatientError';
  }
}
const badRequest = (m: string) => new InternetPatientError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new InternetPatientError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new InternetPatientError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new InternetPatientError(409, 'CONFLICT', m);

const MAX_PROFILES = 5;

/** 患者登录返回 */
export interface PatientLoginResult {
  token: string;
  accountId: string;
  openid: string | null;
  isDemoLogin: boolean;
  profileCount: number;
}

/** 微信小程序登录（code 换 openid，创建/查找账号，签发患者 JWT） */
export async function loginWithWechat(input: { code: string; ip?: string }): Promise<PatientLoginResult> {
  if (!input.code?.trim()) throw badRequest('微信登录 code 不能为空');
  const wx = getWechatLoginProvider();
  const session = await wx.code2Session(input.code.trim());

  return withTx(async (tx) => {
    const r = await createAccount({
      openid: session.openid,
      unionid: session.unionid,
      channel: 'wechat',
    }, tx);
    await touchAccount(r.account.id, tx, input.ip);
    const profiles = await listProfilesRepo(r.account.id, tx);
    await recordChainAudit({
      actorId: r.account.id,
      action: 'patient.login',
      resourceType: 'patient_account',
      resourceId: r.account.id,
      result: 'success',
      riskLevel: 'low',
      detail: { created: r.created, demo: wx.isDemo },
    }, tx);
    const token = signJwt(
      {
        sub: r.account.id,
        name: '患者',
        roles: ['patient'],
        permissions: ['patient:account', 'patient:realname', 'triage:use', 'delegation:manage'],
      },
      Number(process.env.PATIENT_TOKEN_TTL ?? 7200),
    );
    return {
      token,
      accountId: r.account.id,
      openid: r.account.openid,
      isDemoLogin: wx.isDemo,
      profileCount: profiles.length,
    };
  });
}

/** 绑定手机号（L1） */
export async function bindPhone(
  accountId: string,
  input: { phone: string },
): Promise<{ phoneMasked: string }> {
  if (!/^1[3-9]\d{9}$/.test(input.phone)) throw badRequest('手机号格式不正确');
  return withTx(async (tx) => {
    await bindPhoneToAccount(
      accountId,
      encryptField(input.phone),
      hashField(input.phone),
      tx,
    );
    await recordChainAudit({
      actorId: accountId,
      action: 'patient.bind_phone',
      resourceType: 'patient_account',
      resourceId: accountId,
      result: 'success',
      riskLevel: 'low',
    }, tx);
    return { phoneMasked: input.phone.slice(0, 3) + '****' + input.phone.slice(-4) };
  });
}

/** 列出账号下就诊人（脱敏视图） */
export async function listMyProfiles(accountId: string): Promise<Array<{
  id: string;
  relation: string;
  nameMasked: string | null;
  gender: string | null;
  authLevel: number;
  isDefault: boolean;
  patientId: string | null;
  delegatedScopes: string[];
}>> {
  const profiles = await listProfilesRepo(accountId);
  return profiles.map((p) => ({
    id: p.id,
    relation: p.relation,
    nameMasked: p.nameMasked,
    gender: p.gender,
    authLevel: p.authLevel,
    isDefault: p.isDefault,
    patientId: p.patientId,
    delegatedScopes: p.delegatedScopes,
  }));
}

/** 添加就诊人（L1，基本信息，不含强实名） */
export async function addProfile(
  accountId: string,
  input: {
    relation: PatientProfile['relation'];
    name: string;
    gender?: '男' | '女' | '未知';
    birthDate?: string;
    isDefault?: boolean;
  },
): Promise<{ id: string; authLevel: number }> {
  if (!input.name?.trim()) throw badRequest('就诊人姓名不能为空');
  return withTx(async (tx) => {
    const existing = await listProfilesRepo(accountId, tx);
    if (existing.length >= MAX_PROFILES) {
      throw conflict(`一个账号最多绑定 ${MAX_PROFILES} 位就诊人`);
    }
    const profile = await createProfile({
      accountId,
      relation: input.relation,
      nameEnc: encryptField(input.name.trim()),
      nameMasked: maskName(input.name.trim()),
      gender: input.gender ?? null,
      birthDate: input.birthDate ?? null,
      authLevel: 1,
      isDefault: input.isDefault ?? existing.length === 0,
    }, tx);
    await recordChainAudit({
      actorId: accountId,
      action: 'patient.add_profile',
      resourceType: 'patient_profile',
      resourceId: profile.id,
      result: 'success',
      riskLevel: 'low',
    }, tx);
    return { id: profile.id, authLevel: profile.authLevel };
  });
}

/** 校验就诊人归属（属于该账号），加行锁返回 */
async function requireOwnedProfile(
  accountId: string,
  profileId: string,
  tx: TransactionSql,
): Promise<PatientProfile> {
  const profile = await lockProfile(profileId, tx);
  if (!profile) throw notFound('就诊人不存在');
  if (profile.accountId !== accountId) throw forbidden('不能访问他人就诊人');
  return profile;
}

/** 实名认证（L2）：身份证 + 人脸，通过后绑定/创建 EMPI 患者 */
export async function verifyRealname(
  accountId: string,
  input: {
    profileId: string;
    realName: string;
    idCard: string;
    faceImageBase64?: string;
    guardianProfileId?: string;
  },
  traceId: string,
): Promise<{
  passed: boolean;
  provider: string;
  isDemo: boolean;
  patientId: string | null;
  authLevel: number;
}> {
  if (!input.realName?.trim()) throw badRequest('真实姓名不能为空');
  if (!input.idCard?.trim()) throw badRequest('身份证号不能为空');

  const provider = getRealnameProvider();
  const result = await provider.verify({
    realName: input.realName.trim(),
    idCard: input.idCard.trim(),
    faceImageBase64: input.faceImageBase64,
  });

  return withTx(async (tx) => {
    const profile = await requireOwnedProfile(accountId, input.profileId, tx);

    // 记录认证历史（无论通过与否）
    await insertRealnameRecord(
      {
        profileId: profile.id,
        verifyType: input.faceImageBase64 ? 'face' : 'id_card',
        provider: result.provider,
        status: result.passed ? 'passed' : 'failed',
        reason: result.reason ?? null,
        traceId,
      },
      tx,
    );

    if (!result.passed) {
      await recordChainAudit({
        actorId: accountId,
        action: 'patient.realname_failed',
        resourceType: 'patient_profile',
        resourceId: profile.id,
        result: 'failure',
        riskLevel: 'medium',
        detail: { reason: result.reason },
      }, tx);
      return {
        passed: false,
        provider: result.provider,
        isDemo: result.isDemo,
        patientId: profile.patientId,
        authLevel: profile.authLevel,
      };
    }

    // 认证通过：回填姓名/身份证/性别/生日，认证等级提升到 L2
    const idCardHash = hashField(input.idCard);
    const derivedBirth = birthDateFromIdCard(input.idCard);
    const derivedGender = genderFromIdCard(input.idCard);
    const guardianId =
      input.guardianProfileId && (derivedBirth && calcAge(derivedBirth) < 18)
        ? input.guardianProfileId
        : profile.guardianId;

    await patchProfile(
      profile.id,
      {
        name_enc: encryptField(input.realName.trim()),
        name_masked: maskName(input.realName.trim()),
        id_card_enc: encryptField(input.idCard.trim()),
        id_card_hash: idCardHash,
        gender: derivedGender ?? profile.gender,
        birth_date: derivedBirth ?? profile.birthDate,
        auth_level: 2,
        verified_at: new Date().toISOString(),
        guardian_id: guardianId,
      },
      tx,
    );

    // EMPI 绑定：按身份证哈希查找院内患者，有则绑定，无则创建
    let patient: Patient | null = await getPatientByIdCardHash(idCardHash, tx);
    if (!patient) {
      const mrn = await nextInternetPatientNo(tx);
      patient = await createPatient(
        {
          mrn,
          nameMasked: maskName(input.realName.trim()),
          nameEnc: encryptField(input.realName.trim()),
          gender: derivedGender ?? '未知',
          birthDate: derivedBirth,
          idCardHash,
          dataLevel: 3,
        },
        tx,
      );
    }
    await patchProfile(profile.id, { patient_id: patient.id }, tx);

    await recordChainAudit({
      actorId: accountId,
      action: 'patient.realname_passed',
      resourceType: 'patient_profile',
      resourceId: profile.id,
      result: 'success',
      riskLevel: 'medium',
      detail: { patientId: patient.id, created: true, demo: result.isDemo },
    }, tx);

    return {
      passed: true,
      provider: result.provider,
      isDemo: result.isDemo,
      patientId: patient.id,
      authLevel: 2,
    };
  });
}

/** 计算年龄（周岁） */
function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** 按 id 取就诊人（验证归属，返回脱敏详情） */
export async function getMyProfile(
  accountId: string,
  profileId: string,
): Promise<{ id: string; nameMasked: string; gender: string | null; authLevel: number; patientId: string | null }> {
  const p = await getProfileById(profileId);
  if (!p) throw notFound('就诊人不存在');
  if (p.accountId !== accountId) throw forbidden('不能访问他人就诊人');
  return {
    id: p.id,
    nameMasked: p.nameMasked ?? '',
    gender: p.gender,
    authLevel: p.authLevel,
    patientId: p.patientId,
  };
}

/* ------------------------------------------------------------------ */
/* 医护线上资质                                                        */
/* ------------------------------------------------------------------ */

/** 医护提交线上执业资质申请（本人） */
export async function submitPractitioner(
  userId: string,
  input: {
    practitionerNo?: string;
    practitionerType: InternetPractitioner['practitionerType'];
    practiceScope?: string;
    practiceYears?: number;
    validFrom?: string;
    validTo?: string;
  },
): Promise<{ id: string; auditStatus: string; created: boolean }> {
  if (input.practiceYears != null && input.practiceYears < 0) {
    throw badRequest('执业年限不能为负');
  }
  return withTx(async (tx) => {
    const r = await upsertPractitioner(
      {
        userId,
        practitionerNo: input.practitionerNo ?? null,
        practitionerType: input.practitionerType,
        practiceScope: input.practiceScope ?? null,
        practiceYears: input.practiceYears ?? null,
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
      },
      tx,
    );
    await recordChainAudit({
      actorId: userId,
      action: 'internet.practitioner_submit',
      resourceType: 'internet_practitioner',
      resourceId: r.practitioner.id,
      result: 'success',
      riskLevel: 'low',
      detail: { created: r.created },
    }, tx);
    return { id: r.practitioner.id, auditStatus: r.practitioner.auditStatus, created: r.created };
  });
}

/** 管理端列出线上资质（可按状态过滤） */
export async function listPractitioners(status?: string): Promise<InternetPractitioner[]> {
  return listPractitionersRepo(status);
}

/** 管理端审核线上资质（pending -> approved/rejected） */
export async function auditPractitioner(
  practitionerId: string,
  auditorId: string,
  input: { decision: 'approved' | 'rejected'; reason?: string },
): Promise<InternetPractitioner> {
  if (input.decision === 'rejected' && !input.reason?.trim()) {
    throw badRequest('驳回必须填写理由');
  }
  return withTx(async (tx) => {
    const locked = await lockPractitioner(practitionerId, tx);
    if (!locked) throw notFound('资质申请不存在');
    if (locked.auditStatus !== 'pending') {
      throw conflict(`仅待审核(pending)申请可审核，当前 ${locked.auditStatus}`);
    }
    const updated = await reviewPractitioner(
      practitionerId,
      input.decision,
      input.reason?.trim() ?? null,
      auditorId,
      tx,
    );
    await recordChainAudit({
      actorId: auditorId,
      action: `internet.practitioner_${input.decision}`,
      resourceType: 'internet_practitioner',
      resourceId: practitionerId,
      result: 'success',
      riskLevel: 'medium',
    }, tx);
    return updated;
  });
}

/** 医护查询本人线上资质 */
export async function getMyPractitioner(userId: string): Promise<InternetPractitioner | null> {
  return listPractitionersRepo().then((all) => all.find((p) => p.userId === userId) ?? null);
}
