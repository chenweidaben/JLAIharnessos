/**
 * 健澜科技 jlmedaios - 【科研管理深化】科研项目路由（M162-C）
 *
 * 【医院全场景】科研管理要真实，不能凑数：
 *   GET /api/v1/research/projects?dept=NEU&year=2026
 *       → 科室年度课题组合：课题台账 / 论文四阶段 / 成果转化 / 经费对照 /
 *         影响力得分汇总（纯函数 buildResearchPortfolio）；
 *   PUT /api/v1/research/projects/:id/milestone
 *       → 登记里程碑（申报/立项/中期/结题/验收），纯函数推进进度与状态闭环。
 *
 * 鉴权：未登录 401。入参非法一律 400 结构化错误信封，不抛 500。
 * 里程碑登记落内存台账（断库时科研管理页仍可真实回读；DB 迁移后 best-effort
 * 回写 research.research_project_deep）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  SEED_PROJECTS,
  buildResearchPortfolio,
  calculateResearchImpact,
  trackProjectMilestone,
  type ResearchProjectDeep,
} from '../aggregators/researchDeepAggregator';

/**
 * 内存课题台账：BFF 进程启动时由种子课题初始化；
 * PUT 里程碑时原地推进（纯函数产出新对象后替换），断库亦可真实回读。
 */
const projectLedger = new Map<string, ResearchProjectDeep>(
  SEED_PROJECTS.map((p) => [p.id, { ...p }]),
);

export const researchDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/projects',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const dept = c.query.get('dept') ?? '';
      if (!dept) {
        return json(fail(ErrorCode.BAD_REQUEST, '承担科室 dept 不能为空', c.traceId), 400);
      }
      // 缺省年度：2026（当前科研考核年度）
      const yearRaw = c.query.get('year') ?? '2026';

      try {
        // 用内存台账当前状态构建组合（里程碑推进后立即可见）
        const portfolio = buildResearchPortfolio(dept, yearRaw, [...projectLedger.values()]);
        return json(ok(portfolio, '科研项目组合已加载'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '科研项目组合加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/research/projects/:id/milestone',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const id = c.params.id ?? '';
      if (!projectLedger.has(id)) {
        return json(fail(ErrorCode.NOT_FOUND, `课题 ${id} 不存在`, c.traceId), 404);
      }

      let body: { name?: unknown; stage?: unknown; recordedAt?: unknown };
      try {
        body = await c.body();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }

      try {
        const project = projectLedger.get(id)!;
        // 纯函数推进里程碑（乱序/重复/非法阶段一律抛错）
        const next = trackProjectMilestone(project, {
          name: body.name,
          stage: body.stage,
          recordedAt: body.recordedAt,
        });
        projectLedger.set(id, next);

        // 随附最新影响力计算结果（透明口径，便于前端等级展示）
        const impact = calculateResearchImpact(next);
        return json(
          ok({ project: next, impact }, '里程碑已登记'),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '里程碑登记失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
