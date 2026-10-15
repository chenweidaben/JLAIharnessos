/**
 * 健澜科技 jlmedaios - 系统帮助中心路由（M125-D，演示就绪）
 *
 * GET /api/v1/help?role=doctor[&q=关键字]
 *  - role: doctor / nurse / admin / newbie（未知回退 doctor）；
 *  - q（可选）：传入时额外返回 searchHelp 命中结果。
 *
 * 数据源：helpCenterAggregator 纯函数内容盘（演示就绪，不连 PostgreSQL、不抛错）。
 * 后续接入 CMS/知识库时，仅替换内容盘来源，buildHelpContent / searchHelp 签名不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildHelpContent,
  searchHelp,
  type HelpContent,
  type HelpSearchResult,
} from '../aggregators/helpCenterAggregator.js';

export const helpCenterRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/help',
    handle: (c) => {
      try {
        const role = c.query.get('role') ?? undefined;
        const keyword = c.query.get('q') ?? '';

        // 纯函数组装（角色过滤已内置），空角色安全回退
        const content: HelpContent = buildHelpContent(role);

        // 可选关键字检索：传入 q 时附带命中结果
        const results: HelpSearchResult[] = keyword.trim() ? searchHelp(keyword, content) : [];

        return json(ok({ content, results }, 'ok', c.traceId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'help center internal error';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
