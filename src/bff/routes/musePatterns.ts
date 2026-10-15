/**
 * 健澜科技 jlmedaios - 经验关联发现路由（M118-D）
 *
 * 依据宪法第七章（个人信息归属与医院数据治理）：
 *   GET /api/v1/muse/patterns —— 返回自动挖掘的「条件 → 结局」经验规律
 *   （组合频次 frequency + 条件概率置信度 confidence），供管理员复盘参考。
 *
 * 权限边界（依据第七章个人信息归属）：
 *  - 本端点仅 admin 角色可访问（院长 / 职能科室主任）；
 *  - 未登录 → 401；普通员工访问 → 403 FORBIDDEN；
 *  - 返回数据均为脱敏标签统计，不含患者直标身份。
 *
 * 医疗安全：本端点只读，不触发任何经验写入或自动处置动作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requireRole } from '../middleware/auth';
import { listExperiencePatterns } from '../aggregators/experiencePatternAggregator';

export const musePatternsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/patterns',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // 仅 admin 角色（依据宪法第七章：个人健康数据归患者，管理端仅管理员可复盘）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      try {
        const data = await listExperiencePatterns();
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '经验模式发现加载失败'),
          500,
        );
      }
    },
  },
];
