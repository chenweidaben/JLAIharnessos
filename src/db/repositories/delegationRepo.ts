/**
 * 健澜科技 jlmedaios - 家属代办授权 Repository（M3-Q）
 *
 * 管理 profile_delegations 历史与 patient_profiles 的授权范围。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface DelegationRow {
  id: string;
  profileId: string;
  granterAccountId: string;
  scopes: string[];
  action: 'grant' | 'update' | 'revoke';
  status: 'active' | 'revoked';
  note: string | null;
  createdAt: string;
}

/** 解析 jsonb 数组，兼容 postgres.js 返回字符串的情况。 */
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

function mapRow(r: Record<string, unknown>): DelegationRow {
  return {
    id: String(r.id),
    profileId: String(r.profile_id),
    granterAccountId: String(r.granter_account_id),
    scopes: parseJsonbArray(r.scopes),
    action: r.action as DelegationRow['action'],
    status: r.status as DelegationRow['status'],
    note: r.note ? String(r.note) : null,
    createdAt: String(r.created_at),
  };
}

const COLS = `
  id, profile_id, granter_account_id, scopes, action, status, note, created_at
`;

/** 写入一条授权历史（grant/update/revoke）。 */
export async function insertDelegation(
  input: {
    profileId: string;
    granterAccountId: string;
    scopes: string[];
    action: DelegationRow['action'];
    status: DelegationRow['status'];
    note?: string | null;
  },
  tx: DbExecutor,
): Promise<DelegationRow> {
  const rows = await tx`
    INSERT INTO clinical.profile_delegations
      (profile_id, granter_account_id, scopes, action, status, note)
    VALUES (
      ${input.profileId}, ${input.granterAccountId},
      ${input.scopes}::jsonb, ${input.action}, ${input.status},
      ${input.note ?? null}
    )
    RETURNING ${tx.unsafe(COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

/** 同步 patient_profiles 的授权范围（与历史同事务）。 */
export async function applyProfileScopes(
  profileId: string,
  scopes: string[],
  state: 'active' | 'revoked',
  tx: DbExecutor,
): Promise<void> {
  if (state === 'active') {
    await tx`
      UPDATE clinical.patient_profiles
         SET delegated_scopes = ${scopes}::jsonb,
             delegation_granted_at = COALESCE(delegation_granted_at, now()),
             delegation_revoked_at = NULL,
             updated_at = now()
       WHERE id = ${profileId}
    `;
  } else {
    await tx`
      UPDATE clinical.patient_profiles
         SET delegated_scopes = '[]'::jsonb,
             delegation_revoked_at = now(),
             updated_at = now()
       WHERE id = ${profileId}
    `;
  }
}

/** 查某就诊人的授权历史（最新在前）。 */
export async function listDelegationsByProfile(
  profileId: string,
  db?: DbExecutor,
): Promise<DelegationRow[]> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(COLS)} FROM clinical.profile_delegations
     WHERE profile_id = ${profileId}
     ORDER BY created_at DESC
  `;
  return rows.map((r) => mapRow(r as Record<string, unknown>));
}
