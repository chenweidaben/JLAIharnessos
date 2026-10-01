/**
 * 健澜科技 jlmedaios - 家属代办授权聚合器（M3-Q）
 *
 * 授权范围管理：授予/更新/撤销就诊人代办权限，全程留痕；
 * 代办校验：canActOnBehalf 供预约/问诊/支付/报告等域调用。
 *
 * 安全边界：
 *  - 授权范围必须显式授予，默认无代办权；
 *  - 高风险（支付/退费）需二次确认；
 *  - 仅账号本人可管理其就诊人授权。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { lockProfile } from '../../db/repositories/internetPatientRepo.js';
import {
  applyProfileScopes,
  insertDelegation,
  listDelegationsByProfile,
} from '../../db/repositories/delegationRepo.js';
import {
  hasHighRiskScope,
  normalizeScopes,
  assertNonEmpty,
} from '../../knowledge/rules/delegationScopes.js';

export class DelegationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DelegationError';
  }
}
const badRequest = (m: string) => new DelegationError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new DelegationError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new DelegationError(403, 'FORBIDDEN', m);

/** 授权/更新：设置就诊人代办范围。 */
export async function grantDelegation(
  accountId: string,
  input: {
    profileId: string;
    scopes: string[];
    note?: string;
    confirmHighRisk?: boolean;
  },
): Promise<{ profileId: string; scopes: string[] }> {
  const { scopes, invalid } = normalizeScopes(input.scopes);
  if (invalid.length > 0) throw badRequest(`含非法授权范围：${invalid.join('、')}`);
  if (!assertNonEmpty(scopes)) throw badRequest('请至少选择一项代办事项');
  if (hasHighRiskScope(scopes) && !input.confirmHighRisk) {
    throw badRequest('支付/退费属高风险授权，请二次确认后再提交');
  }

  return withTx(async (tx) => {
    const profile = await lockProfile(input.profileId, tx);
    if (!profile) throw notFound('就诊人不存在');
    if (profile.accountId !== accountId) {
      throw forbidden('仅账号本人可管理就诊人授权');
    }
    const alreadyGranted = profile.delegatedScopes.length > 0;
    const action = alreadyGranted ? 'update' : 'grant';

    await insertDelegation(
      {
        profileId: profile.id,
        granterAccountId: accountId,
        scopes,
        action,
        status: 'active',
        note: input.note ?? null,
      },
      tx,
    );
    await applyProfileScopes(profile.id, scopes, 'active', tx);

    await recordChainAudit(
      {
        actorId: accountId,
        action: `delegation.${action}`,
        resourceType: 'patient_profile',
        resourceId: profile.id,
        result: 'success',
        riskLevel: hasHighRiskScope(scopes) ? 'high' : 'low',
        detail: { scopes },
      },
      tx,
    );

    return { profileId: profile.id, scopes };
  });
}

/** 撤销：清空就诊人全部代办范围。 */
export async function revokeDelegation(
  accountId: string,
  input: { profileId: string; note?: string },
): Promise<{ profileId: string }> {
  return withTx(async (tx) => {
    const profile = await lockProfile(input.profileId, tx);
    if (!profile) throw notFound('就诊人不存在');
    if (profile.accountId !== accountId) {
      throw forbidden('仅账号本人可撤销就诊人授权');
    }
    if (profile.delegatedScopes.length === 0) {
      return { profileId: profile.id }; // 幂等：本就无授权
    }

    await insertDelegation(
      {
        profileId: profile.id,
        granterAccountId: accountId,
        scopes: [],
        action: 'revoke',
        status: 'revoked',
        note: input.note ?? null,
      },
      tx,
    );
    await applyProfileScopes(profile.id, [], 'revoked', tx);

    await recordChainAudit(
      {
        actorId: accountId,
        action: 'delegation.revoke',
        resourceType: 'patient_profile',
        resourceId: profile.id,
        result: 'success',
        riskLevel: 'low',
      },
      tx,
    );

    return { profileId: profile.id };
  });
}

/** 查某就诊人的授权历史。 */
export async function listDelegations(
  accountId: string,
  input: { profileId: string },
) {
  // 归属校验（只读，无需锁）
  const history = await listDelegationsByProfile(input.profileId);
  if (history.length > 0 && history[0].granterAccountId !== accountId) {
    // 历史最新一条的 granter 即账号本人；非本人不可查
    throw forbidden('不能查看他人就诊人授权');
  }
  return history;
}

/**
 * 代办校验：就诊人是否被授予指定 scope。
 * 供预约/问诊/支付/报告等域调用，返回 boolean。
 */
export function canActOnBehalf(
  delegatedScopes: string[],
  requiredScope: string,
): boolean {
  return delegatedScopes.includes(requiredScope);
}
