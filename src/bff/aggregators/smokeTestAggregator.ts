/**
 * 健澜科技 jlmedaios - 全系统路由回归冒烟测试聚合器
 *
 * 本模块仅提供纯函数与静态清单：
 *  - KNOWN_GET_ROUTES：冒烟基准 GET 路由清单（含 MUSE 系列）
 *  - classifyStatus：把 HTTP 状态码归一为冒烟结论（pass / auth / forbidden / fail）
 *  - classifyAuthRequirement：按路径模式归一鉴权需求（public / auth / admin）
 *  - summarize：对一批路由冒烟结果做汇总（总数 / 通过 / 失败 / 失败清单）
 *
 * 设计约束：
 *  - 不发起任何 HTTP 请求，不连接数据库，不读取环境副作用；
 *  - 仅做确定性运算，便于在单元测试与 BFF 路由层直接复用；
 *  - 路由层（routes/smokeTest.ts）以「静态已知清单」遍历结果作为入参，
 *    本模块只负责归类与汇总，不关心路由清单来源。
 *
 * 依据：宪法第三章（权限与访问控制基线）——所有 BFF 端点按
 * public / auth / admin 三档标注，冒烟据此做静态漂移比对。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 冒烟结论四分类 */
export type SmokeStatus = 'pass' | 'auth' | 'forbidden' | 'fail';

/** 鉴权需求三分类（依据宪法第三章） */
export type AuthRequirement = 'public' | 'auth' | 'admin';

/**
 * 单条路由冒烟结果。
 *
 * 说明：这是「静态遍历与已知清单比对」得出的合成结果，并非真实 HTTP 响应。
 *  - status = 200：路由存在且结构合法（通过）
 *  - status = 401：路由受登录保护（预期鉴权拦截，非故障）
 *  - status = 403：路由受 RBAC 保护（预期权限拦截，非故障）
 *  - status = 500：路由缺失 / 重复 / 前缀漂移（回归故障）
 *  - auth：按路径模式归一的鉴权需求标注（依据宪法第三章）
 */
export interface SmokeRouteResult {
  /** HTTP 方法（冒烟只覆盖 GET） */
  method: string;
  /** 路由路径模式，如 /api/v1/admin/users/:id */
  path: string;
  /** 静态比对得出的合成状态码 */
  status: number;
  /** 备注（失败原因、说明等） */
  note?: string;
  /** 鉴权需求标注（依据宪法第三章） */
  auth: AuthRequirement;
}

/** 冒烟汇总结果 */
export interface SmokeSummary {
  /** 参与统计的路由总数 */
  total: number;
  /** 通过数（状态分类为 pass） */
  pass: number;
  /** 失败数（状态分类为 fail） */
  fail: number;
  /** 失败明细清单（保持入参顺序） */
  failures: SmokeRouteResult[];
  /** 按鉴权需求分桶的路由计数（依据宪法第三章） */
  byAuth: Record<AuthRequirement, number>;
}

/**
 * 已知 GET 路由清单（静态维护，冒烟基准）。
 *
 * 覆盖系统关键 GET 读取端点；新增 / 下线路由时需同步更新此清单。
 * 注意：此清单仅用于静态遍历，不代表在线实时路由表。
 *
 * 分组：
 *  - 基础与可观测（public / auth）
 *  - 系统管理（admin，依据宪法第三章）
 *  - 智能体平台（auth）
 *  - MUSE 智慧员工系列（auth / admin，依据宪法第七章）
 *  - 临床业务（auth，抽样关键读取端点）
 */
export const KNOWN_GET_ROUTES: readonly string[] = [
  // 基础与可观测
  '/api/v1/health',
  '/api/v1/model-info',
  '/api/v1/medmuse/agent-health',
  '/api/v1/medmuse/feedback/stats',
  // 系统管理（admin，依据宪法第三章）
  '/api/v1/admin/users',
  '/api/v1/admin/users/:id',
  '/api/v1/admin/roles',
  '/api/v1/admin/roles/:code',
  '/api/v1/admin/permissions',
  '/api/v1/admin/permissions/matrix',
  '/api/v1/admin/permissions/roles',
  '/api/v1/admin/tenants/tree',
  '/api/v1/admin/audit-logs',
  '/api/v1/admin/audit-logs/overview',
  '/api/v1/admin/audit-logs/distribution',
  '/api/v1/admin/audit-logs/trend',
  '/api/v1/admin/audit-logs/:seq',
  '/api/v1/admin/login-logs',
  '/api/v1/admin/login-logs/overview',
  '/api/v1/admin/login-logs/trend',
  // 智能体平台
  '/api/v1/agent-builder/agents',
  '/api/v1/agent-builder/agents/:agentId',
  '/api/v1/agent-runtime/instances',
  '/api/v1/agent-runtime/instances/:instanceId',
  '/api/v1/human-tasks',
  '/api/v1/human-tasks/:taskId',
  // MUSE 智慧员工系列（依据宪法第七章；鉴权档见 classifyAuthRequirement）
  '/api/v1/muse/home',
  '/api/v1/muse/nurse',
  '/api/v1/muse/pharma',
  '/api/v1/muse/onboarding',
  '/api/v1/muse/search',
  '/api/v1/muse/admin',
  '/api/v1/muse/hospital',
  // 临床业务（抽样关键读取端点）
  '/api/v1/admission-notes',
  '/api/v1/ai-note-qc',
  '/api/v1/ai-note-drafts',
  '/api/v1/appt/requests',
  '/api/v1/appt/followup-plans',
  '/api/v1/ams/catalog',
];

/**
 * 公开路由白名单（无需登录即可访问，依据宪法第三章）。
 * 仅包含真正的健康检查 / 元信息端点；其余默认按 auth 处理。
 */
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  '/api/v1/health',
  '/api/v1/model-info',
]);

/**
 * 精确匹配的 admin 路由（非 /api/v1/admin/* 前缀，但需 admin / 院长权限）。
 * 依据宪法第三章 + 第七章 7.9（全院视角仅院长 / admin）。
 */
const ADMIN_EXACT_ROUTES: ReadonlySet<string> = new Set([
  '/api/v1/muse/admin',
  '/api/v1/muse/hospital',
  '/api/v1/test/smoke',
]);

/**
 * 将 HTTP 状态码归类为冒烟结论。
 *
 * 映射规则：
 *  - 2xx（含 200）            → 'pass'       路由可用
 *  - 401                      → 'auth'       未登录（预期鉴权拦截，非路由故障）
 *  - 403                      → 'forbidden'  权限不足（预期 RBAC 拦截，非路由故障）
 *  - 5xx（含 500）            → 'fail'       服务端错误 / 路由缺失
 *  - 其余（400 / 404 / 429 等）→ 'fail'       保守口径按失败处理
 *
 * @param status HTTP 状态码（静态比对时为合成状态码）
 * @returns 归一化结论
 *
 * @example
 * classifyStatus(200); // 'pass'
 * classifyStatus(401);  // 'auth'
 * classifyStatus(403);  // 'forbidden'
 * classifyStatus(500);  // 'fail'
 */
export function classifyStatus(status: number): SmokeStatus {
  if (status >= 200 && status < 300) return 'pass';
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status >= 500 && status < 600) return 'fail';
  return 'fail';
}

/**
 * 按路径模式归一鉴权需求（依据宪法第三章）。
 *
 * 判定优先级：
 *  1. 命中 PUBLIC_ROUTES 白名单 → 'public'（健康检查 / 元信息）
 *  2. 命中 ADMIN_EXACT_ROUTES 精确集 → 'admin'（MUSE 管理 / 全院视角 / 冒烟自身）
 *  3. 以 /api/v1/admin/ 开头 → 'admin'（系统管理后台）
 *  4. 其余默认 → 'auth'（登录员工可读）
 *
 * 纯函数：仅依据路径字符串判定，不读取运行时上下文。
 *
 * @param route 路由路径模式（如 /api/v1/admin/users/:id）
 * @returns 鉴权需求三分类
 *
 * @example
 * classifyAuthRequirement('/api/v1/health');          // 'public'
 * classifyAuthRequirement('/api/v1/admin/users');      // 'admin'
 * classifyAuthRequirement('/api/v1/muse/hospital');    // 'admin'
 * classifyAuthRequirement('/api/v1/muse/home');       // 'auth'
 */
export function classifyAuthRequirement(route: string): AuthRequirement {
  if (PUBLIC_ROUTES.has(route)) return 'public';
  if (ADMIN_EXACT_ROUTES.has(route)) return 'admin';
  if (route.startsWith('/api/v1/admin/')) return 'admin';
  return 'auth';
}

/**
 * 对一批路由冒烟结果做汇总。
 *
 * 统计口径：
 *  - total：结果总数（入参长度）
 *  - pass：分类为 'pass' 的条数
 *  - fail：分类为 'fail' 的条数
 *  - failures：所有 'fail' 结果的明细（保持原顺序）
 *  - byAuth：按鉴权需求分桶的路由计数（依据宪法第三章）
 *
 * 注意：'auth' / 'forbidden' 属预期鉴权拦截，既不计入 pass 也不计入 fail，
 * 因此 pass + fail 可能小于 total。
 *
 * @param results 单条路由冒烟结果数组
 * @returns 汇总对象
 */
export function summarize(results: readonly SmokeRouteResult[]): SmokeSummary {
  let pass = 0;
  const failures: SmokeRouteResult[] = [];
  const byAuth: Record<AuthRequirement, number> = { public: 0, auth: 0, admin: 0 };
  for (const r of results) {
    const cat = classifyStatus(r.status);
    if (cat === 'pass') {
      pass += 1;
    } else if (cat === 'fail') {
      failures.push(r);
    }
    byAuth[r.auth] = (byAuth[r.auth] ?? 0) + 1;
  }
  return {
    total: results.length,
    pass,
    fail: failures.length,
    failures,
    byAuth,
  };
}
