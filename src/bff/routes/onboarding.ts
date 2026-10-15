/**
 * 健澜科技 jlmedaios - 新员工入职向导路由（M134-A）
 * GET /api/v1/user/onboarding — 当前登录员工的入职向导 + 进度
 *
 * 依据「后继者站在巨人肩膀上」理念：新员工登录后进入「我的入职向导」，
 * 后端按其岗位（医生/护士/药师/管理员）返回第1天/第1周/第1月/第3月
 * 四阶段任务清单，并叠加一份确定性进度推演（完成百分比 + 智慧度对比）。
 *
 * 【用户体验深化】
 *  - 进入页即拉取，不需要员工手动选科室/选岗位；
 *  - 进度与向导同包返回，前端一次请求渲染进度条 + 任务列表；
 *  - 未登录直接 401，不回显任何员工数据。
 *
 * 数据源：纯函数 buildOnboardingGuide / getOnboardingProgress，
 * 不触 PostgreSQL；后续接入职进度仓库时仅替换内部推演，签名不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildOnboardingGuide,
  getOnboardingProgress,
} from '../aggregators/onboardingAggregator.js';

/** iam 原始角色码 → onboarding 角色（未知回落 doctor，与 aggregator 对齐） */
function toOnboardingRole(rawRoles: readonly string[]): string {
  const head = rawRoles[0] ?? '';
  if (head === 'nurse' || head === 'pharmacist' || head === 'admin') return head;
  return 'doctor';
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

export const onboardingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/user/onboarding',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      try {
        const staffId = view.id;
        const role = toOnboardingRole(view.rawRoles);
        // 纯函数：组装岗位差异化向导 + 确定性进度推演
        const guide = buildOnboardingGuide(staffId, role);
        const progress = getOnboardingProgress(staffId);
        return json(
          ok({
            staffId,
            deptCode: view.deptCode,
            deptName: view.deptName,
            realName: view.realName,
            guide,
            progress,
          }),
        );
      } catch (err) {
        console.error(`[user-onboarding error] ${c.req.url} [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '入职向导加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
