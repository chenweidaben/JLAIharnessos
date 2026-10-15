/**
 * 健澜科技 jlmedaios - 系统帮助中心路由（M147-D，生产就绪）
 *
 * 「知识图谱与患者教育」模块的 BFF 出口：
 *   GET /api/v1/help?role=doctor[&page=faq][&q=关键字]
 *  - role: doctor / nurse / admin（未知回退 doctor）；
 *  - page（可选）: features / steps / faq / shortcuts（未知回退 all）；
 *  - q（可选）: 传入时额外返回 searchHelp 命中结果（按角色范围检索）。
 *
 * 数据源：helpCenterAggregator 纯函数内容盘（不连 PostgreSQL、不抛错）。
 * 后续接入 CMS / 知识图谱时，仅替换内容盘来源，buildHelpCenter / searchHelp 签名不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildHelpCenter,
  searchHelp,
  type HelpContent,
  type HelpItem,
} from '../aggregators/helpCenterAggregator.js';

export const helpCenterRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/help',
    handle: (c) => {
      try {
        const role = c.query.get('role') ?? undefined;
        const page = c.query.get('page') ?? undefined;
        const keyword = c.query.get('q') ?? '';

        // 纯函数组装（角色过滤 + 分面过滤已内置），非法入参安全回退
        const content: HelpContent = buildHelpCenter(role, page);

        // 可选关键字检索：传入 q 时附带命中结果（范围 = 该角色可见条目）
        const results: HelpItem[] = keyword.trim() ? searchHelp(keyword, role) : [];

        return json(ok({ content, results }, 'ok', c.traceId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'help center internal error';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
