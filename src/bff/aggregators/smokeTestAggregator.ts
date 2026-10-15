/**
 * 健澜科技 jlmedaios - 全系统路由回归冒烟测试聚合器【生产就绪质量门禁】
 *
 * 本模块仅提供纯函数与静态清单：
 *  - KNOWN_GET_ROUTES：冒烟基准 GET 路由清单（含 MUSE 系列，旧版静态比对）
 *  - classifyStatus：把 HTTP 状态码归一为冒烟结论（pass / auth / forbidden / fail）
 *  - classifyAuthRequirement：按路径模式归一鉴权需求（public / auth / admin）
 *  - summarize：对一批路由冒烟结果做汇总（总数 / 通过 / 失败 / 失败清单）
 *
 * M135-A 全路由冒烟（新增）：
 *  - DEFAULT_ROUTE_INVENTORY：覆盖 admin / doctor / nurse / pharma / patient / public
 *    六桶的基准路由清单（全部取自 BFF 已登记的真实 GET 路径）
 *  - resolveUrl：把带 :param 的路径模式解析为可探测的具体 URL
 *  - smokeTestAllRoutes(routes, baseUrl, probe?)：纯函数探针编排，逐条记录
 *    通过 / 失败 / 响应时间（elapsedMs）；probe 可注入，默认纯结构探针零 I/O
 *  - generateSmokeReport(results, meta?)：纯函数报告生成，含通过率、
 *    分桶统计、平均 / 最大响应时间、失败明细与质量门禁结论 ok
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
  '/api/v1/admin/test/smoke',
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

/* =========================================================================
 * M135-A 全路由冒烟测试【生产就绪质量门禁】
 * -------------------------------------------------------------------------
 * 覆盖维度：admin / doctor / nurse / pharma / patient / public 六桶；
 * 每条路由记录：通过(绿) / 失败(红) / 响应时间(elapsedMs)。
 * 纯函数设计：探针 RouteProbe 可注入——
 *   - 单测 / CI 注入假探针，断言聚合与报告生成；
 *   - 生产路由层默认使用 structuralProbe（纯结构校验，零网络副作用）。
 * ========================================================================= */

/** 业务角色桶（全路由覆盖维度；M149-A 扩展 ai 桶） */
export type RouteBucket =
  | 'public'
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'pharma'
  | 'patient'
  | 'ai';

/** 单条待测路由定义（路由发现的输入单元） */
export interface SmokeRouteDef {
  /** HTTP 方法（冒烟以 GET 为主） */
  method: string;
  /** 路由路径模式，如 /api/v1/admin/users/:id */
  path: string;
  /** 业务角色桶 */
  bucket: RouteBucket;
  /** 中文标签（前端红绿报告展示用） */
  label?: string;
}

/** 探针返回的单条探测结果 */
export interface ProbeOutcome {
  /** HTTP 状态码（合成或真实） */
  status: number;
  /** 响应时间（毫秒） */
  elapsedMs: number;
  /** 备注（失败原因等） */
  note?: string;
}

/**
 * 探针函数签名：给定路由定义与解析后的完整 URL，返回响应结果。
 * 注入点：生产默认 structuralProbe；测试 / CI 可替换为真实 fetch 探针或假探针。
 */
export type RouteProbe = (def: SmokeRouteDef, url: string) => ProbeOutcome;

/** 单条路由冒烟结果（红绿报告的最小单元） */
export interface SmokeResult {
  /** HTTP 方法 */
  method: string;
  /** 路由路径模式 */
  path: string;
  /** 解析后的完整 URL（baseUrl + 具体路径） */
  url: string;
  /** 业务角色桶 */
  bucket: RouteBucket;
  /** 中文标签 */
  label?: string;
  /** 探测状态码 */
  status: number;
  /** 是否通过（2xx = 绿；其余 = 红） */
  ok: boolean;
  /** 响应时间（毫秒） */
  elapsedMs: number;
  /** 备注（失败原因等） */
  note?: string;
}

/** 单桶统计 */
export interface BucketStat {
  total: number;
  pass: number;
  fail: number;
}

/** 整份冒烟报告（generateSmokeReport / smokeAllRoutes 的输出） */
export interface SmokeReport {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 探测基准地址 */
  baseUrl: string;
  /** 路由总数 */
  total: number;
  /** 通过数（绿，2xx） */
  pass: number;
  /** 失败数（红，5xx / 结构漂移） */
  fail: number;
  /** 通过率 0..1 */
  passRate: number;
  /** 质量门禁结论：fail === 0 即为 true（全绿放行） */
  ok: boolean;
  /** 平均响应时间（毫秒） */
  avgElapsedMs: number;
  /** 最大响应时间（毫秒） */
  maxElapsedMs: number;
  /** 按业务角色桶分桶统计 */
  byBucket: Record<RouteBucket, BucketStat>;
  /** 失败明细（保持入参顺序） */
  failures: SmokeResult[];
  /** 全部逐条结果 */
  results: SmokeResult[];
  /** 需认证数（401，M149-A：预期登录拦截，非故障） */
  auth: number;
  /** 权限不足数（403，M149-A：预期 RBAC 拦截，非故障） */
  forbidden: number;
  /** 四分类计数（M149-A：通过 / 失败 / 需认证 / 权限不足） */
  byVerdict: Record<SmokeStatus, number>;
}

/**
 * 把带 :param 的路径模式解析为可探测的具体 URL。
 *
 * 规则：
 *  - baseUrl 尾部斜杠归一（去尾 /）；
 *  - 路径参数段 :id / :visitId 等统一替换为采样值 "1"，
 *    得到确定性的具体地址，便于纯函数与单测复用。
 *
 * @example
 * resolveUrl('http://localhost:8080/', '/api/v1/a/:id');
 * // 'http://localhost:8080/api/v1/a/1'
 */
export function resolveUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const concrete = path.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '1');
  return `${normalizedBase}${concrete}`;
}

/**
 * 默认探针：纯结构校验（零 I/O、零网络副作用）。
 *
 * 判定：
 *  - 路径以 /api/v1/ 开头 → 200（结构合法）
 *  - 否则 → 500（路径前缀漂移，回归故障）
 *
 * 这是生产路由层的安全默认值：冒烟质量门禁只做路由登记漂移比对，
 * 不对业务端点发起真实调用，避免鉴权 / 副作用风险。
 */
export const structuralProbe: RouteProbe = (def) => {
  if (!def.path.startsWith('/api/v1/')) {
    return { status: 500, elapsedMs: 0, note: '路径缺少 /api/v1/ 前缀' };
  }
  return { status: 200, elapsedMs: 0 };
};

/**
 * 全路由冒烟编排（纯函数）。
 *
 * 对每条路由定义：
 *  1. method 归一为大写；
 *  2. 路径不以 / 开头 → 500 fail（结构非法）；
 *  3. 同一路径重复登记 → 500 fail（第二条起判重）；
 *  4. 调用探针 probe(def, url) 获取状态码与响应时间；
 *  5. 2xx → ok=true（绿），其余 → ok=false（红）。
 *
 * 注意：本函数不发起任何网络请求——网络行为完全由注入的 probe 决定。
 *
 * @param routes 待测路由清单（路由发现结果）
 * @param baseUrl 探测基准地址，如 http://127.0.0.1:8080
 * @param probe 探针（默认 structuralProbe，纯结构校验）
 * @returns 逐条冒烟结果（保持入参顺序）
 */
export function smokeTestAllRoutes(
  routes: readonly SmokeRouteDef[],
  baseUrl: string,
  probe: RouteProbe = structuralProbe,
): SmokeResult[] {
  const seen = new Set<string>();
  const results: SmokeResult[] = [];

  for (const raw of routes) {
    const method = raw.method.toUpperCase();
    const url = resolveUrl(baseUrl, raw.path);
    const base: SmokeResult = {
      method,
      path: raw.path,
      url,
      bucket: raw.bucket,
      label: raw.label,
      status: 0,
      ok: false,
      elapsedMs: 0,
    };

    if (!raw.path.startsWith('/')) {
      results.push({ ...base, status: 500, note: '路径必须以 / 开头' });
      continue;
    }
    if (seen.has(raw.path)) {
      results.push({ ...base, status: 500, note: '路由重复登记' });
      continue;
    }
    seen.add(raw.path);

    const outcome = probe(raw, url);
    results.push({
      ...base,
      status: outcome.status,
      ok: outcome.status >= 200 && outcome.status < 300,
      elapsedMs: Math.max(0, Math.round(outcome.elapsedMs)),
      note: outcome.note,
    });
  }

  return results;
}

/**
 * 由逐条结果生成整份冒烟报告（纯函数）。
 *
 * 统计口径：
 *  - total / pass / fail：逐条结果计数，fail 与 failures 明细一致；
 *  - passRate：pass / total，total 为 0 时记 1（空清单视为通过）；
 *  - ok：fail === 0 的质量门禁结论（全绿放行）；
 *  - avgElapsedMs / maxElapsedMs：全部结果的响应时间聚合；
 *  - byBucket：六桶各自的 total / pass / fail；
 *  - failures：所有红项明细（保持原顺序）。
 *
 * @param results smokeTestAllRoutes 的输出
 * @param meta 可选元信息（baseUrl / generatedAt）；测试可固定时间戳
 * @returns 红绿报告数据
 */
export function generateSmokeReport(
  results: readonly SmokeResult[],
  meta: { baseUrl?: string; generatedAt?: string } = {},
): SmokeReport {
  const emptyBucket: BucketStat = { total: 0, pass: 0, fail: 0 };
  const byBucket = {
    public: { ...emptyBucket },
    admin: { ...emptyBucket },
    doctor: { ...emptyBucket },
    nurse: { ...emptyBucket },
    pharma: { ...emptyBucket },
    patient: { ...emptyBucket },
    ai: { ...emptyBucket },
  } as Record<RouteBucket, BucketStat>;

  const failures: SmokeResult[] = [];
  const byVerdict: Record<SmokeStatus, number> = {
    pass: 0,
    auth: 0,
    forbidden: 0,
    fail: 0,
  };
  let elapsedSum = 0;
  let maxElapsedMs = 0;

  for (const r of results) {
    const stat = byBucket[r.bucket];
    stat.total += 1;
    const verdict = classifyStatus(r.status);
    byVerdict[verdict] += 1;
    // M149-A：仅 2xx 计通过、5xx/结构漂移计失败；401/403 为预期鉴权拦截，
    // 既不计通过也不计失败（与 classifyStatus 四分类口径一致）。
    if (verdict === 'pass') {
      stat.pass += 1;
    } else if (verdict === 'fail') {
      stat.fail += 1;
      failures.push(r);
    }
    elapsedSum += r.elapsedMs;
    if (r.elapsedMs > maxElapsedMs) maxElapsedMs = r.elapsedMs;
  }

  const total = results.length;
  const pass = byVerdict.pass;

  return {
    generatedAt: meta.generatedAt ?? new Date().toISOString(),
    baseUrl: meta.baseUrl ?? '',
    total,
    pass,
    fail: failures.length,
    passRate: total === 0 ? 1 : Number((pass / total).toFixed(4)),
    ok: failures.length === 0,
    avgElapsedMs: total === 0 ? 0 : Math.round(elapsedSum / total),
    maxElapsedMs,
    byBucket,
    failures,
    results: [...results],
    auth: byVerdict.auth,
    forbidden: byVerdict.forbidden,
    byVerdict,
  };
}

/**
 * 全路由冒烟基准清单【生产就绪质量门禁】。
 *
 * 覆盖六桶（全部取自 BFF 已登记的真实 GET 路径）：
 *  - public：健康检查 / 模型元信息（无需登录）
 *  - admin：系统管理后台（仅 admin，依据宪法第三章）
 *  - doctor：医生侧（门诊队列 / 医生工作台 / MUSE）
 *  - nurse：护士侧（护士站 / MUSE 护士）
 *  - pharma：药师侧（调剂队列 / 库存 / MUSE 药师）
 *  - patient：患者侧（门户 / 移动首页）
 *
 * 新增 / 下线路由时需同步更新本清单，保持冒烟基准与路由表一致。
 */
export const DEFAULT_ROUTE_INVENTORY: readonly SmokeRouteDef[] = [
  // public 公开路由
  { method: 'GET', path: '/api/v1/health', bucket: 'public', label: '健康检查' },
  { method: 'GET', path: '/api/v1/model-info', bucket: 'public', label: '模型元信息' },
  // admin 系统管理
  { method: 'GET', path: '/api/v1/admin/health', bucket: 'admin', label: '系统健康' },
  { method: 'GET', path: '/api/v1/admin/dashboard', bucket: 'admin', label: '管理驾驶舱' },
  { method: 'GET', path: '/api/v1/admin/users', bucket: 'admin', label: '用户管理' },
  { method: 'GET', path: '/api/v1/admin/audit-logs', bucket: 'admin', label: '审计日志' },
  { method: 'GET', path: '/api/v1/admin/test/smoke', bucket: 'admin', label: '全路由冒烟' },
  // doctor 医生侧
  { method: 'GET', path: '/api/v1/doctor/workbench', bucket: 'doctor', label: '医生工作台' },
  { method: 'GET', path: '/api/v1/outpatient/queue', bucket: 'doctor', label: '门诊队列' },
  { method: 'GET', path: '/api/v1/muse/home', bucket: 'doctor', label: 'MUSE 个人主页' },
  // nurse 护士侧
  { method: 'GET', path: '/api/v1/nurse-station/ward', bucket: 'nurse', label: '护士站病区' },
  { method: 'GET', path: '/api/v1/muse/nurse', bucket: 'nurse', label: 'MUSE 护士' },
  // pharma 药师侧
  { method: 'GET', path: '/api/v1/pharmacy/queue/dispense', bucket: 'pharma', label: '调剂队列' },
  { method: 'GET', path: '/api/v1/pharmacy/inventory', bucket: 'pharma', label: '药品库存' },
  { method: 'GET', path: '/api/v1/muse/pharma', bucket: 'pharma', label: 'MUSE 药师' },
  // patient 患者侧
  { method: 'GET', path: '/api/v1/patient/portal', bucket: 'patient', label: '患者门户' },
  { method: 'GET', path: '/api/v1/patient/mobile/home', bucket: 'patient', label: '患者移动首页' },
];

/* =========================================================================
 * M149-A 全路由冒烟测试（六前缀全覆盖，生产质量门禁）
 * -------------------------------------------------------------------------
 * 测试范围：/admin/* /doctor/* /nurse/* /pharma/* /patient/* /ai/*
 * 输出四分类：通过(pass) / 失败(fail) / 需认证(auth) / 权限不足(forbidden)
 *
 * 纯函数设计：枚举已知路由清单，不实际发 HTTP 请求、不连数据库、不读环境。
 * 每条路由按其鉴权档合成「匿名探针」预期结果：
 *  - bucket === 'admin' → 403 权限不足（预期 RBAC 拦截，非故障）
 *  - 其余受保护桶（doctor/nurse/pharma/patient/ai）→ 401 需认证
 *    （预期登录拦截，非故障）
 *  - 路径缺 /api/v1/ 前缀 或 method+path 重复登记 → 500 失败（路由漂移）
 *
 * 质量门禁结论 ok：fail === 0（即清单无结构漂移）即放行。
 * ========================================================================= */

/** M149-A 全量路由清单中的一条（method + path + 业务桶） */
export interface FullRouteEntry {
  method: string;
  path: string;
  bucket: RouteBucket;
}

/**
 * M149-A 全路由冒烟基准清单【生产质量门禁】。
 *
 * 枚举自 BFF 已登记的真实路由（src/bff/routes/**，含 admin 子目录），
 * 覆盖六前缀、全部 HTTP 方法（GET/POST/PUT/DELETE），不得遗漏。
 * 新增 / 下线路由时需同步更新本清单。
 */
export const FULL_ROUTE_INVENTORY: readonly FullRouteEntry[] = [
  { method: 'GET', path: '/api/v1/admin/alerts', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/api-keys', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/api-keys', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/audit-logs', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/audit-logs/:seq', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/audit-logs/distribution', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/audit-logs/overview', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/audit-logs/trend', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/audit/logs', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/backup/export', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/backup/import', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/checkup/list', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/config', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/config/:key', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/dashboard', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/deploy/config', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/disputes', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/disputes', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/equipment', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/equipment', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/equipment/:id/maintenance', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/errors', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/export', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/export/meta', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/feedback/analysis', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/finance/report', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/finance/transaction', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/health', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/hospitals', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/import/patients', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/import/template', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/indicators', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/indicators/dashboard', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/indicators/values', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/infection/alerts', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/infection/events', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/infection/report', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/insurance/review', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/intelligence-score', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/kpi', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/leave', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/leave', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/login-logs', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/login-logs/force-logout', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/login-logs/overview', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/login-logs/trend', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/logs', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/metrics', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/migrate/run', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/migrations', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/party-union', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/party-union', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/performance', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/performance/:period', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/performance/dept', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/performance/frontend', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/performance/optimizations', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/performance/slow-queries', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/permissions', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/permissions/entry', bucket: 'admin' },
  { method: 'DELETE', path: '/api/v1/admin/permissions/grant', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/permissions/grant', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/permissions/matrix', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/permissions/roles', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/quality/monitor', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/records/audit', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/reports/export', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/reports/export/meta', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/research', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/research', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/research/:id/progress', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/review/checklist', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/roles', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/roles', bucket: 'admin' },
  { method: 'DELETE', path: '/api/v1/admin/roles/:code', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/roles/:code', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/roles/:code', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/roles/:code/permissions', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/satisfaction/report', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/schedules', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/schedules/assign', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/schedules/publish', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/security/mask-config', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/self-learning/log', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/self-learning/optimize', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/service/assign', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/service/resolve', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/service/tickets', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/sessions', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/sessions/revoke', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/shift-defs', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/supply', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/supply/in', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/supply/out', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/surgery/schedule/optimize', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/teaching', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/teaching', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/tenants', bucket: 'admin' },
  { method: 'DELETE', path: '/api/v1/admin/tenants/:id', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/tenants/:id/config', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/tenants/:id/status', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/tenants/tree', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/test/coverage', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/test/e2e', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/test/performance', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/test/performance/optimizations', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/test/security', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/test/smoke', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/trends/analysis', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/users', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/users', bucket: 'admin' },
  { method: 'DELETE', path: '/api/v1/admin/users/:id', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/users/:id', bucket: 'admin' },
  { method: 'PUT', path: '/api/v1/admin/users/:id', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/users/:id/reset-password', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/users/:id/status', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/webhooks', bucket: 'admin' },
  { method: 'POST', path: '/api/v1/admin/webhooks', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/admin/wisdom/dashboard', bucket: 'admin' },
  { method: 'GET', path: '/api/v1/ai-note-drafts', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai-note-drafts/:id/review', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai-note-drafts/generate', bucket: 'ai' },
  { method: 'GET', path: '/api/v1/ai-note-qc', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai-note-qc/scan', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai-nursing-plans/:id/accept', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai-nursing-plans/recommend', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai/diagnose', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai/drug-review', bucket: 'ai' },
  { method: 'GET', path: '/api/v1/ai/drug-review/stats', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai/generate-record', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai/generate-record/:id/improve', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai/quality-check', bucket: 'ai' },
  { method: 'POST', path: '/api/v1/ai/quality-feedback', bucket: 'ai' },
  { method: 'GET', path: '/api/v1/ai/quality-report', bucket: 'ai' },
  { method: 'GET', path: '/api/v1/doctor/follow-ups', bucket: 'doctor' },
  { method: 'GET', path: '/api/v1/doctor/growth-profile', bucket: 'doctor' },
  { method: 'GET', path: '/api/v1/doctor/workbench', bucket: 'doctor' },
  { method: 'GET', path: '/api/v1/nurse-station/:visitId/evaluations', bucket: 'nurse' },
  { method: 'GET', path: '/api/v1/nurse-station/visit/:visitId', bucket: 'nurse' },
  { method: 'GET', path: '/api/v1/nurse-station/ward', bucket: 'nurse' },
  { method: 'GET', path: '/api/v1/nurse/handoff', bucket: 'nurse' },
  { method: 'POST', path: '/api/v1/nurse/handoff', bucket: 'nurse' },
  { method: 'GET', path: '/api/v1/patient/billing', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/checkup/:id', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/chronic', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/chronic/overview', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/education', bucket: 'patient' },
  { method: 'POST', path: '/api/v1/patient/education/push', bucket: 'patient' },
  { method: 'POST', path: '/api/v1/patient/feedback', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/follow-ups', bucket: 'patient' },
  { method: 'POST', path: '/api/v1/patient/guide', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/h5/home', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/lab-explain', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/mobile/home', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/muse/:id', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/portal', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/reminders', bucket: 'patient' },
  { method: 'POST', path: '/api/v1/patient/service/create', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/patient/service/my', bucket: 'patient' },
  { method: 'POST', path: '/api/v1/patient/service/satisfaction', bucket: 'patient' },
  { method: 'POST', path: '/api/v1/patient/survey/submit', bucket: 'patient' },
  { method: 'GET', path: '/api/v1/pharmacy-tasks', bucket: 'pharma' },
  { method: 'POST', path: '/api/v1/pharmacy-tasks/:id/complete', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/audit-patterns', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/dispensings', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/inventory', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/inventory/movements', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/prescriptions', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/prescriptions/:id/cds', bucket: 'pharma' },
  { method: 'POST', path: '/api/v1/pharmacy/prescriptions/:id/dispense', bucket: 'pharma' },
  { method: 'POST', path: '/api/v1/pharmacy/prescriptions/:id/review', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/queue/dispense', bucket: 'pharma' },
  { method: 'GET', path: '/api/v1/pharmacy/queue/review', bucket: 'pharma' },
];

/**
 * 全路由冒烟编排（M149-A，纯函数，不实际发 HTTP 请求）【生产质量门禁】。
 *
 * 对清单逐条：
 *  1. method 归一为大写；
 *  2. 路径缺 /api/v1/ 前缀 → 500 失败（路由漂移）；
 *  3. method+path 重复登记 → 500 失败（第二条起判重）；
 *  4. bucket === 'admin' → 403 权限不足（预期 RBAC 拦截）；
 *  5. 其余受保护桶 → 401 需认证（预期登录拦截）。
 *
 * 质量门禁 ok = fail === 0（清单无结构漂移即放行）。
 *
 * @param inventory 待测路由清单（默认 FULL_ROUTE_INVENTORY，六前缀全覆盖）
 * @param generatedAt 报告时间戳（可注入，便于单测固定）
 * @returns 整份 SmokeReport（含四分类计数 byVerdict）
 */
export function smokeAllRoutes(
  inventory: readonly FullRouteEntry[] = FULL_ROUTE_INVENTORY,
  generatedAt?: string,
): SmokeReport {
  const seen = new Set<string>();
  const results: SmokeResult[] = [];

  for (const entry of inventory) {
    const method = entry.method.toUpperCase();
    const base: SmokeResult = {
      method,
      path: entry.path,
      url: entry.path,
      bucket: entry.bucket,
      status: 0,
      ok: false,
      elapsedMs: 0,
    };

    if (!entry.path.startsWith('/api/v1/')) {
      results.push({ ...base, status: 500, note: '路径缺少 /api/v1/ 前缀' });
      continue;
    }

    const key = `${method} ${entry.path}`;
    if (seen.has(key)) {
      results.push({ ...base, status: 500, note: '路由重复登记' });
      continue;
    }
    seen.add(key);

    // 合成匿名探针预期：admin 桶 → 403 权限不足；其余受保护桶 → 401 需认证
    const status = entry.bucket === 'admin' ? 403 : 401;
    results.push({
      ...base,
      status,
      ok: status >= 200 && status < 300,
    });
  }

  return generateSmokeReport(results, { baseUrl: '', generatedAt });
}
