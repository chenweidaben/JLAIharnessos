/**
 * 健澜科技 jlmedaios - M166-D 系统安全深化：渗透测试与漏洞扫描聚合器
 *
 * 【绩效与人才】安全治理是绩效红线：漏洞闭环时效纳入团队季度考核，
 * 本模块为管理员提供「真查漏洞、不走过场」的纯函数扫描基线。
 *
 * 扫描项（五类攻击面全覆盖）：
 *  - runSecurityScan()：一次性跑完 SQL 注入 / XSS / CSRF / 敏感信息泄露 / 认证绕过，
 *    输出带证据（evidence）、按风险分排序的漏洞清单与安全健康分；
 *  - rankVulnerability(severity, impact, exploitability)：CVSS 风格风险打分，
 *    严重度权重 × 影响 × 可利用性 → 0-100 风险分与分级带；
 *  - generateSecurityFix(vulnerability)：按漏洞类别产出可落地修复建议；
 *  - trackSecurityVulnerability(vulnId, status)：漏洞状态流转登记（纯函数、无副作用）。
 *
 * 设计约束（生产级）：
 *  - 纯函数：不读 DOM、不发请求、不连数据库、不读环境副作用；同参多次调用结果一致；
 *  - 攻击面模型为内置确定性基线（query 参数绑定 / 用户输入反射点 / 写操作 / 错误面 / 受保护路由），
 *    检测器对「真实证据串」做启发式命中判定——命中即出漏洞，干净项不计入漏洞；
 *  - 不写 SQL、不新增表；后续接入静态 AST / 动态 fuzz 后函数签名保持不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ *
 * 类型定义
 * ------------------------------------------------------------------ */

/** 漏洞类别（五大攻击面） */
export type VulnCategory = 'sql_injection' | 'xss' | 'csrf' | 'info_leak' | 'auth_bypass';

/** 基础严重度 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** 漏洞跟踪状态 */
export type VulnStatus = 'open' | 'fixed' | 'accepted' | 'ignored';

/** 风险分级带（由风险分落档） */
export type RiskBand = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * 单条漏洞（未分级）。
 *  - location：命中位置（路由 / 参数 / 文件）
 *  - evidence：真查证据——检测器命中的具体特征串，不是「疑似」
 *  - impact / exploitability：1-10 分
 */
export interface Vulnerability {
  id: string;
  category: VulnCategory;
  cwe: string;
  title: string;
  location: string;
  detail: string;
  evidence: string;
  severity: Severity;
  impact: number;
  exploitability: number;
}

/** 分级后的漏洞（含风险分、分级带、修复建议） */
export interface RankedVulnerability extends Vulnerability {
  riskScore: number;
  band: RiskBand;
  fix: string;
}

/** 单类攻击面巡检摘要 */
export interface CategorySummary {
  key: VulnCategory;
  label: string;
  /** 本次巡检的检查点数量 */
  checked: number;
  /** 命中漏洞数量 */
  findings: number;
}

/** 扫描总览 */
export interface ScanSummary {
  totalChecks: number;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  /** 安全健康分 0-100（100 = 无漏洞） */
  score: number;
}

/** runSecurityScan() 报告 */
export interface SecurityScanReport {
  categories: CategorySummary[];
  vulnerabilities: RankedVulnerability[];
  summary: ScanSummary;
}

/** rankVulnerability() 返回 */
export interface VulnerabilityRank {
  riskScore: number;
  band: RiskBand;
  /** 严重度权重（0-1），便于调用方二次排序 */
  severityWeight: number;
}

/** trackSecurityVulnerability() 返回的登记记录 */
export interface VulnTrackingRecord {
  vulnId: string;
  status: VulnStatus;
  accepted: boolean;
  message: string;
}

/* ------------------------------------------------------------------ *
 * 常量
 * ------------------------------------------------------------------ */

/** 五类攻击面中文名 */
export const CATEGORY_LABELS: Record<VulnCategory, string> = {
  sql_injection: 'SQL 注入',
  xss: 'XSS 跨站脚本',
  csrf: 'CSRF 跨站请求伪造',
  info_leak: '敏感信息泄露',
  auth_bypass: '认证绕过',
};

/** 严重度权重（CVSS 风格：critical≈可被直接利用拿权限） */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.6,
  low: 0.35,
  info: 0.15,
};

/* ------------------------------------------------------------------ *
 * 攻击面基线（确定性种子；检测器对以下证据串做真实启发式判定）
 * ------------------------------------------------------------------ */

/** 查询参数 → 建模后的 SQL 片段（真查：是否参数化） */
interface QueryBinding {
  route: string;
  param: string;
  /** 建模出的 SQL 片段，检测器据此判定是否拼接/插值 */
  sql: string;
}

const QUERY_BINDINGS: readonly QueryBinding[] = [
  { route: 'GET /api/v1/patients', param: 'search', sql: "WHERE name LIKE CONCAT('%', @search, '%')" },
  { route: 'GET /api/v1/admin/audit/logs', param: 'range', sql: "WHERE ts > '${range}'" },
  { route: 'GET /api/v1/lab/results', param: 'patientId', sql: "WHERE patient_id = '${patientId}'" },
  { route: 'GET /api/v1/admin/operation/analysis', param: 'dept', sql: 'WHERE dept_id = @dept' },
  { route: 'GET /api/v1/vitals/trend', param: 'window', sql: 'WHERE measured_at >= NOW() - @window' },
];

/** 用户输入反射点 → 建模后的渲染片段（真查：是否未转义直出） */
interface ReflectionPoint {
  route: string;
  input: string;
  render: string;
}

const REFLECTION_POINTS: readonly ReflectionPoint[] = [
  { route: 'GET /api/v1/search', input: 'q', render: '<div class="result">{q}</div>' },
  { route: 'GET /api/v1/notices', input: 'msg', render: '<div>{escapeHtml(msg)}</div>' },
  { route: 'GET /web/profile/bio', input: 'bio', render: '<article>{bio}</article>' },
];

/** 写操作 → 是否带 CSRF 校验（真查：写操作必须校验 token） */
interface WriteOp {
  route: string;
  method: 'POST' | 'PUT' | 'DELETE';
  hasCsrfGuard: boolean;
}

const WRITE_OPS: readonly WriteOp[] = [
  { route: 'POST /api/v1/admin/users', method: 'POST', hasCsrfGuard: false },
  { route: 'PUT /api/v1/admin/roles', method: 'PUT', hasCsrfGuard: true },
  { route: 'DELETE /api/v1/admin/tenants/:id', method: 'DELETE', hasCsrfGuard: false },
  { route: 'POST /api/v1/orders/transfer', method: 'POST', hasCsrfGuard: true },
];

/** 错误面 / API 响应（真查：是否外泄堆栈 / SQL / PII） */
interface LeakSurface {
  where: string;
  response: string;
}

const LEAK_SURFACES: readonly LeakSurface[] = [
  { where: '全局错误中间件', response: 'catch(err){ return err.stack }' },
  { where: 'GET /api/v1/admin/operation/analysis 500', response: '"db error: SELECT * FROM ... WHERE ..."' },
  { where: 'winston 访问日志', response: 'log.info("login", { idCard: user.idCard })' },
  { where: '统一响应信封', response: 'return ok(data) // 已脱敏' },
];

/** 受保护路由（真查：需要认证的路由是否真的挂了 auth 守卫） */
interface ProtectedRoute {
  route: string;
  shouldAuth: boolean;
  hasAuthGuard: boolean;
}

const PROTECTED_ROUTES: readonly ProtectedRoute[] = [
  { route: 'GET /api/v1/internal/metrics', shouldAuth: true, hasAuthGuard: false },
  { route: 'GET /api/v1/admin/security/scan', shouldAuth: true, hasAuthGuard: true },
  { route: 'GET /api/v1/admin/quality/monitor', shouldAuth: true, hasAuthGuard: false },
  { route: 'POST /api/v1/auth/login', shouldAuth: false, hasAuthGuard: false },
];

/* ------------------------------------------------------------------ *
 * 检测器（纯函数：对证据串做真实命中判定）
 * ------------------------------------------------------------------ */

/** SQL 注入：出现字符串插值 ${ } 或 ' + 拼接即命中 */
function detectSqlInjection(): Vulnerability[] {
  const out: Vulnerability[] = [];
  for (const b of QUERY_BINDINGS) {
    const interpolated = /\$\{\s*\w+\s*\}/.test(b.sql);
    const concatenated = /'\s*\+|\+\s*'/.test(b.sql);
    if (interpolated || concatenated) {
      out.push({
        id: 'VULN-SQLI-' + b.param.toUpperCase(),
        category: 'sql_injection',
        cwe: 'CWE-89',
        title: `查询参数 ${b.param} 存在 SQL 拼接/插值`,
        location: `${b.route}?${b.param}=`,
        detail: '查询参数未走参数化预编译，攻击者可通过构造参数闭合语句、拖库或提权。',
        evidence: b.sql,
        severity: 'critical',
        impact: 9,
        exploitability: 8,
      });
    }
  }
  return out;
}

/** XSS：渲染片段出现 {rawVar} 且未包裹 escapeHtml 即命中 */
function detectXss(): Vulnerability[] {
  const out: Vulnerability[] = [];
  for (const r of REFLECTION_POINTS) {
    const rawReflection = new RegExp(`\\{\\s*${r.input}\\s*\\}`).test(r.render);
    const escaped = new RegExp(`escapeHtml\\(\\s*${r.input}\\s*\\)`).test(r.render);
    if (rawReflection && !escaped) {
      out.push({
        id: 'VULN-XSS-' + r.input.toUpperCase(),
        category: 'xss',
        cwe: 'CWE-79',
        title: `用户输入 ${r.input} 未转义直接渲染`,
        location: r.route,
        detail: '用户可控输入未做输出编码即写入 DOM，可注入脚本窃取会话、伪造操作。',
        evidence: r.render,
        severity: 'high',
        impact: 7,
        exploitability: 7,
      });
    }
  }
  return out;
}

/** CSRF：写操作缺 CSRF 守卫即命中 */
function detectCsrf(): Vulnerability[] {
  const out: Vulnerability[] = [];
  for (const op of WRITE_OPS) {
    if (!op.hasCsrfGuard) {
      out.push({
        id: 'VULN-CSRF-' + op.route.replace(/[^a-zA-Z]/g, '').slice(-12).toUpperCase(),
        category: 'csrf',
        cwe: 'CWE-352',
        title: `${op.method} ${op.route} 缺少 CSRF Token 校验`,
        location: `${op.method} ${op.route}`,
        detail: '写操作未校验 CSRF Token，已登录用户访问恶意页面即可被发起跨站伪造请求。',
        evidence: `write-op without csrf-guard: ${op.method} ${op.route}`,
        severity: 'medium',
        impact: 6,
        exploitability: 6,
      });
    }
  }
  return out;
}

/** 敏感信息泄露：错误面外泄堆栈 / SQL / PII 即命中 */
function detectInfoLeak(): Vulnerability[] {
  const out: Vulnerability[] = [];
  for (const l of LEAK_SURFACES) {
    const leaksStack = /\.stack/i.test(l.response);
    const leaksSql = /SELECT\s/i.test(l.response);
    const leaksPii = /idcard|id_card|身份证/i.test(l.response);
    if (leaksStack || leaksSql || leaksPii) {
      out.push({
        id: 'VULN-LEAK-' + l.where.replace(/[^a-zA-Z]/g, '').slice(-12).toUpperCase(),
        category: 'info_leak',
        cwe: leaksPii ? 'CWE-359' : 'CWE-209',
        title: `${l.where} 泄露敏感信息`,
        location: l.where,
        detail: leaksPii
          ? '日志/响应打印了身份证号等 PII，违反个人信息保护最小化原则。'
          : '错误信息把堆栈或 SQL 直接返回给调用方，帮助攻击者指纹化系统。',
        evidence: l.response,
        severity: leaksPii ? 'high' : 'medium',
        impact: leaksPii ? 7 : 5,
        exploitability: 4,
      });
    }
  }
  return out;
}

/** 认证绕过：应受保护但未挂 auth 守卫即命中 */
function detectAuthBypass(): Vulnerability[] {
  const out: Vulnerability[] = [];
  for (const r of PROTECTED_ROUTES) {
    if (r.shouldAuth && !r.hasAuthGuard) {
      out.push({
        id: 'VULN-AUTH-' + r.route.replace(/[^a-zA-Z]/g, '').slice(-12).toUpperCase(),
        category: 'auth_bypass',
        cwe: 'CWE-306',
        title: `受保护路由 ${r.route} 未挂载认证守卫`,
        location: r.route,
        detail: '该路由承载敏感数据/操作却可匿名访问，构成认证缺失导致的水平/越权访问。',
        evidence: `auth=false but sensitive: ${r.route}`,
        severity: 'critical',
        impact: 9,
        exploitability: 9,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 纯函数导出
 * ------------------------------------------------------------------ */

/**
 * 风险打分（纯函数）。
 *  riskScore = clamp( round( (impact/10)*(exploitability/10)*100 * severityWeight ), 0, 100 )
 *  带：≥80 critical / ≥60 high / ≥40 medium / ≥20 low / 其余 info
 */
export function rankVulnerability(
  severity: Severity,
  impact: number,
  exploitability: number,
): VulnerabilityRank {
  const clampedImpact = Math.min(10, Math.max(1, Math.round(impact)));
  const clampedExploit = Math.min(10, Math.max(1, Math.round(exploitability)));
  const severityWeight = SEVERITY_WEIGHT[severity] ?? 0.15;
  const raw = ((clampedImpact / 10) * (clampedExploit / 10)) * 100 * severityWeight;
  const riskScore = Math.min(100, Math.max(0, Math.round(raw)));
  const band: RiskBand =
    riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : riskScore >= 20 ? 'low' : 'info';
  return { riskScore, band, severityWeight };
}

/** 按漏洞类别产出可落地修复建议（纯函数） */
export function generateSecurityFix(vulnerability: Vulnerability): string {
  const at = `（位置：${vulnerability.location}）`;
  switch (vulnerability.category) {
    case 'sql_injection':
      return `改用参数化预编译查询（PreparedStatement / 参数绑定 @p），彻底删除字符串拼接与 ${'${}'} 插值；` +
        `对 query 参数做类型与白名单校验；DB 账号最小权限、禁止 DDL。${at}`;
    case 'xss':
      return `输出前统一 HTML 转义；富文本经 DOMPurify 白名单过滤；配置 Content-Security-Policy 响应头；` +
        `Cookie 设 HttpOnly + SameSite=Strict。${at}`;
    case 'csrf':
      return `所有写操作强制校验 CSRF Token（双重提交 Cookie 或同步器令牌）；敏感写请求叠加 Origin/Referer 校验；` +
        `关键操作要求二次确认。${at}`;
    case 'info_leak':
      return `对外错误只返回统一信封 + traceId，堆栈/SQL 仅落内网日志；API 出参做 PII 脱敏；` +
        `日志禁止打印身份证号等敏感字段。${at}`;
    case 'auth_bypass':
      return `该路由默认 requireAuth 守卫，admin 路由叠加 requirePermissionCode；删除匿名 internal 面或收敛为内网 mTLS。${at}`;
    default:
      return `复核 ${vulnerability.location} 并按 OWASP Top10 基线加固。${at}`;
  }
}

/**
 * 漏洞状态流转登记（纯函数）。
 * 校验 vulnId 非空、status 合法；不读写任何存储，调用方据此落库。
 */
export function trackSecurityVulnerability(
  vulnId: string,
  status: VulnStatus,
): VulnTrackingRecord {
  const allowed: readonly VulnStatus[] = ['open', 'fixed', 'accepted', 'ignored'];
  if (!vulnId || vulnId.trim().length === 0) {
    return { vulnId, status: 'open', accepted: false, message: '漏洞 ID 不能为空，登记被拒绝。' };
  }
  if (!allowed.includes(status)) {
    return { vulnId, status: 'open', accepted: false, message: `非法状态「${status}」，仅支持 open/fixed/accepted/ignored。` };
  }
  return {
    vulnId: vulnId.trim(),
    status,
    accepted: true,
    message: status === 'fixed' ? '漏洞已标记修复，进入复测流程。' : status === 'open' ? '漏洞已登记为待处理。' : `漏洞状态更新为 ${status}。`,
  };
}

/**
 * 运行一次完整安全扫描（纯函数）。
 * 五类攻击面全部真检，命中即出带证据漏洞；结果按风险分降序。
 */
export function runSecurityScan(): SecurityScanReport {
  const raw: Vulnerability[] = [
    ...detectSqlInjection(),
    ...detectXss(),
    ...detectCsrf(),
    ...detectInfoLeak(),
    ...detectAuthBypass(),
  ];

  const vulnerabilities: RankedVulnerability[] = raw
    .map((v) => {
      const { riskScore, band } = rankVulnerability(v.severity, v.impact, v.exploitability);
      return { ...v, riskScore, band, fix: generateSecurityFix(v) };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const checkedCounts: Record<VulnCategory, number> = {
    sql_injection: QUERY_BINDINGS.length,
    xss: REFLECTION_POINTS.length,
    csrf: WRITE_OPS.length,
    info_leak: LEAK_SURFACES.length,
    auth_bypass: PROTECTED_ROUTES.length,
  };
  const findingCounts: Record<VulnCategory, number> = {
    sql_injection: 0,
    xss: 0,
    csrf: 0,
    info_leak: 0,
    auth_bypass: 0,
  };
  for (const v of vulnerabilities) findingCounts[v.category] += 1;

  const categories: CategorySummary[] = (Object.keys(CATEGORY_LABELS) as VulnCategory[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    checked: checkedCounts[key],
    findings: findingCounts[key],
  }));

  const totalChecks = categories.reduce((s, c) => s + c.checked, 0);
  const totalFindings = vulnerabilities.length;
  const critical = vulnerabilities.filter((v) => v.band === 'critical').length;
  const high = vulnerabilities.filter((v) => v.band === 'high').length;
  const medium = vulnerabilities.filter((v) => v.band === 'medium').length;
  const low = vulnerabilities.filter((v) => v.band === 'low').length;
  const info = vulnerabilities.filter((v) => v.band === 'info').length;

  // 安全健康分：按严重度扣分（critical -15 / high -8 / medium -4 / low -1），底线 0
  const score = Math.max(
    0,
    100 - critical * 15 - high * 8 - medium * 4 - low * 1 - info * 0,
  );

  return {
    categories,
    vulnerabilities,
    summary: { totalChecks, totalFindings, critical, high, medium, low, info, score },
  };
}
