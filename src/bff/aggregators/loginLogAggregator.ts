/**
 * 健澜科技 jlmedaios - 登录日志聚合器（M8-C）
 *
 * 只读编排 loginAttemptRepo：登录日志分页、概览、每日趋势；
 * 另提供对在线用户的强制下线（事务内吊销会话 + 哈希链审计同事务提交）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { revokeForUser } from '../../db/repositories/sessionRepo.js';
import {
  type LoginLogFilter,
  listLoginLogs,
  loginDailyTrend,
  loginLogOverview,
} from '../../db/repositories/loginAttemptRepo.js';

/** 分页查询登录日志 */
export async function queryLoginLogs(filter: LoginLogFilter) {
  return listLoginLogs(filter);
}

/** 登录日志概览统计 */
export async function loginOverview() {
  return loginLogOverview();
}

/** 近 N 天登录趋势 */
export async function loginTrend(days = 7) {
  return loginDailyTrend(days);
}

/** 强制某用户全部会话下线（在线会话），吊销与审计同事务提交 */
export async function forceLogout(
  auth: AuthView,
  userId: string,
): Promise<{ revoked: number }> {
  return getDb().begin(async (tx: DbExecutor) => {
    const revoked = await revokeForUser(userId, 'loginlog_force', null, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'session.force_user_offline',
        resourceType: 'user',
        resourceId: userId,
        result: 'success',
        riskLevel: 'high',
        detail: { revoked },
      },
      tx,
    );
    return { revoked };
  });
}
