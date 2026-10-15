/**
 * 健澜科技 jlmedaios - 新员工入职向导路由（M134-A + M155-D）
 *
 *  GET /api/v1/user/onboarding
 *    当前登录员工的入职向导 + 进度 + 此刻引导步 + 个性化首页 + 快捷键。
 *  PUT /api/v1/user/onboarding/complete/:step
 *    标记某一步引导已完成，返回投影后的最新进度（纯函数切片，不写 SQL）。
 *
 * 依据「后继者站在巨人肩膀上」理念：新员工登录后进入「我的入职向导」，
 * 后端按其岗位（医生/护士/药师/管理员）返回第1天/第1周/第1月/第3月
 * 四阶段任务清单，并叠加一份确定性进度推演（完成百分比 + 智慧度对比）。
 *
 * M155-D「真帮人，不能烦人」：
 *  - currentSteps 按 createdAt 推算入职天数，超过 90 天返回空数组，老员工不再被打扰；
 *  - 每一步前端都可跳过 / 可「不再提示」，不强制弹窗；
 *  - 未登录直接 401，不回显任何员工数据。
 *
 * 数据源：纯函数 buildOnboardingGuide / getOnboardingProgress /
 *         getShortcuts / personalizeHomepage / recordOnboardingProgress，
 * 不触 PostgreSQL；后续接入入职进度仓库时仅替换内部推演，签名不变。
 *
 * 【质量与合规】本切片不写 SQL、无新表；PUT 仅做纯函数投影并回显，
 * 不采集患者数据，不涉及诊疗决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildOnboardingGuide,
  getOnboardingProgress,
  getShortcuts,
  personalizeHomepage,
  recordOnboardingProgress,
} from '../aggregators/onboardingAggregator.js';

/** iam 原始角色码 → onboarding 角色（未知回落 doctor，与 aggregator 对齐） */
function toOnboardingRole(rawRoles: readonly string[]): string {
  const head = rawRoles[0] ?? '';
  if (head === 'nurse' || head === 'pharmacist' || head === 'admin') return head;
  return 'doctor';
}

/** 由账号创建时间推算入职天数（与 aggregator 阶段窗口对齐；缺失时按 0 处理） */
function daysSinceJoin(createdAt: string | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  const ms = Date.now() - created;
  return Math.max(0, Math.floor(ms / 86_400_000));
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
        // M155-D：按入职天数给出「此刻该看的几步」+ 个性化首页 + 工作台快捷键
        const days = daysSinceJoin(view.createdAt);
        const currentSteps = buildOnboardingGuide(role, days);
        const homepage = personalizeHomepage(staffId, role);
        const shortcuts = getShortcuts(role, 'workbench');
        return json(
          ok({
            staffId,
            deptCode: view.deptCode,
            deptName: view.deptName,
            realName: view.realName,
            role,
            daysSinceJoin: days,
            guide,
            progress,
            currentSteps,
            homepage,
            shortcuts,
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
  {
    method: 'PUT',
    path: '/api/v1/user/onboarding/complete/:step',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      const step = (c.params.step ?? '').trim();
      if (!step) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少步骤标识 step', c.traceId), 400);
      }
      try {
        // 纯函数投影：把该步所属阶段 completed +1（封顶），返回最新进度
        const progress = recordOnboardingProgress(view.id, step);
        return json(
          ok({
            staffId: view.id,
            completedStep: step,
            progress,
          }),
        );
      } catch (err) {
        console.error(`[user-onboarding complete error] ${c.req.url} [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '步骤完成状态更新失败', c.traceId),
          500,
        );
      }
    },
  },
];
