/**
 * 健澜科技数智医院智能体 - MFA 登录第二因子路由
 *
 * POST /api/v1/auth/login/mfa：密码登录已返回 mfaRequired + challengeId 后，
 * 客户端提交 TOTP/备份码；校验通过才换发会话 JWT。本路由无需 Bearer 令牌
 * （此时用户尚未完成登录），以一次性 challengeId 作为凭证。
 *
 * 失败：错误动态码 401；连续失败达阈值锁定后 429；挑战不存在/过期/已完成 401。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { issueCsrfToken } from '../middleware/csrf';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { loadViewById, issueTokens, registerSession } from './auth.js';
import { verifyLoginChallenge } from '../aggregators/mfaAggregator.js';

export const mfaLoginRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/auth/login/mfa',
    handle: async (c: Ctx) => {
      const body = await c.body<{ challengeId?: string; token?: string }>();
      const challengeId = (body.challengeId ?? '').trim();
      const token = (body.token ?? '').trim();
      if (!challengeId || !token) {
        return json(fail(ErrorCode.BAD_REQUEST, 'challengeId 或动态码缺失'), 400);
      }

      const result = await verifyLoginChallenge(challengeId, token);
      if (!result.ok) {
        if (result.error === 'LOCKED') {
          return json(
            fail(ErrorCode.RATE_LIMITED, '失败次数过多，登录已临时锁定，请 15 分钟后再试'),
            429,
          );
        }
        if (result.error === 'INVALID_TOKEN') {
          const left = 5 - (result.failedAttempts ?? 0);
          return json(
            fail(
              ErrorCode.UNAUTHORIZED,
              left > 0 ? `动态码错误，还可尝试 ${left} 次` : '动态码错误，挑战已锁定',
            ),
            401,
          );
        }
        return json(fail(ErrorCode.UNAUTHORIZED, '登录挑战无效或已过期，请重新登录'), 401);
      }

      // 第二因子通过：加载用户视图并换发真实 JWT
      const view = await loadViewById(result.userId);
      if (!view) {
        return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      }
      const tokens = issueTokens(view);
      await registerSession(c, view, tokens);
      const csrfToken = issueCsrfToken();
      const res = json(
        ok({
          tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: 7200 },
          user: view,
        }),
      );
      res.headers.set('Set-Cookie', `csrf-token=${csrfToken}; Path=/; SameSite=Lax; Max-Age=7200`);
      return res;
    },
  },
];
