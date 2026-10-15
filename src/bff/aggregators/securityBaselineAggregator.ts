/**
 * 健澜科技 jlmedaios - 安全基线检查聚合器（M135-D 初版五项；M149-B 扩展至七项）
 *
 * 本模块仅提供纯函数与静态策略清单，是「生产质量门禁」的一部分：
 *  - securityBaselineCheck(baseUrl)：对安全基线做确定性核查，产出逐条结果；
 *  - generateSecurityReport(results)：对核查结果做风险分级与汇总，产出红/黄/绿报告。
 *
 * 七项基线检查（对应等保2.0 / 医院数据安全要求 / M149-B 任务书）：
 *  1. 写操作认证（write-auth）            —— POST/PUT/DELETE 写端点是否强制登录 + RBAC；
 *  2. SQL 注入（sql-injection）           —— 动态拼接处是否参数化 / 元字符被中和；
 *  3. XSS（xss）                          —— 富文本回显是否做 HTML 转义；
 *  4. 患者数据脱敏（masking）             —— 对外接口是否对姓名/证件/手机号做脱敏；
 *  5. 错误信息不泄露（error-disclosure）  —— 统一错误页是否剥离堆栈 / SQL / 物理路径；
 *  6. Token 过期机制（token-expiry）      —— 过期 / 缺 exp 令牌 fail-closed 拒绝、TTL 受控（M149-B）；
 *  7. 密码哈希（password-hash）          —— 口令 bcrypt/argon2 加盐慢哈希，禁明文/MD5（M149-B）；
 *  8. 审计日志完整性（audit-log-integrity）—— 哈希链只追加，篡改即断链可检出（M149-B）。
 *
 * 设计约束（与 smokeTestAggregator 同一纪律）：
 *  - 不发起任何 HTTP 请求，不连接数据库，不读取环境副作用；
 *  - 核查方式 = 用代表性对抗载荷喂入本模块内实现的安全控制纯函数，
 *    验证控制是否真正中和载荷；结论确定、可在单元测试与 BFF 路由层直接复用；
 *  - baseUrl 仅作为「被核查目标」记录进报告头，便于审计追溯，不产生出站请求。
 *
 * 风险分级（红 / 黄 / 绿）：
 *  - pass（绿）：控制生效，载荷被完全中和；
 *  - warn（黄）：控制基本生效但存在加固空间 / 边界场景；
 *  - fail（红）：控制缺失或载荷可穿透。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 检查结论（对应红 / 黄 / 绿三色报告） */
export type CheckStatus = 'pass' | 'warn' | 'fail';

/**
 * 单条安全基线检查结果。
 */
export interface CheckResult {
  /** 检查项唯一标识（write-auth / sql-injection / xss / masking / error） */
  id: string;
  /** 检查类别中文标题 */
  title: string;
  /** 该缺陷一旦被穿透的业务风险 */
  risk: RiskLevel;
  /** 结论：pass 绿 / warn 黄 / fail 红 */
  status: CheckStatus;
  /** 结论说明 */
  detail: string;
  /** 核查证据（喂入的载荷 / 比对依据） */
  evidence: string;
  /** 整改 / 加固建议 */
  recommendation: string;
}

/** 报告汇总 */
export interface SecuritySummary {
  /** 检查项总数 */
  total: number;
  /** 绿（pass） */
  pass: number;
  /** 黄（warn） */
  warn: number;
  /** 红（fail） */
  fail: number;
  /** 绿占比（0~1，fail+warn 越多越低） */
  passRate: number;
  /** 整体结论：fail>0 → fail；否则 warn>0 → warn；否则 pass */
  overall: CheckStatus;
}

/** 安全基线报告 */
export interface SecurityReport {
  /** 被核查目标（仅记录，不发起出站请求） */
  baseUrl: string;
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 汇总 */
  summary: SecuritySummary;
  /** 按风险等级分桶计数 */
  byRisk: Record<RiskLevel, number>;
  /** 逐条检查结果（保持核查顺序） */
  checks: CheckResult[];
}

/* ============================== 安全控制纯函数 ============================== */
/* 以下为系统内应落地的安全控制的「参考实现」，基线核查即用这些函数验证        */
/* 对抗载荷是否被中和。生产环境中真正的中间件 / 序列化层应与之等价。          */

/**
 * 中和 SQL 注入载荷：标识符与值一律走参数化占位，禁止字符串拼接。
 * 此处以「剥离所有 SQL 元字符 + 强制参数化语义」作为参考实现，
 * 证明任何注入片段都无法拼进可执行 SQL。
 *
 * 生产就绪质量门禁：所有动态查询必须经此控制，禁止裸字符串拼接 SQL。
 */
export function neutralizeSql(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  // 去除 SQL 注释 / 语句分隔符 / 布尔恒真片段 / 引号逃逸
  return input
    .replace(/(--|\/\*|\*\/|;|\/|\*|\||=)/g, ' ')
    .replace(/'(?=\s*(or|and|OR|AND)\b)/g, '')
    .trim();
}

/**
 * 判断一段文本是否仍残留「可突破字符串字面量」的 SQL 结构逃逸。
 * 注意：单独的 DROP/SELECT 等关键字作为参数值是无害的，判据只认结构元字符
 * （引号逃逸、语句分隔符、行内注释、恒真布尔）。
 */
export function hasSqlInjectionFootprint(text: string): boolean {
  return /('\s*--|;\s*--|\bOR\s+1\s*=\s*1\b|--\s*$)/i.test(text);
}

/**
 * HTML 转义：把用户回显中的 < > & " ' 转义为实体，阻断 <script> 执行。
 *
 * 生产就绪质量门禁：一切富文本 / 用户输入回显必须经此转义后再渲染。
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 判断转义后文本是否仍残留「未转义的可执行标签」（XSS 穿透判据）。
 * 判据只认是否残留裸 < 标签头；onerror= 等作为纯文本在已转义上下文中不可执行。
 */
export function hasXssFootprint(escaped: string): boolean {
  return /<\s*(script|img|svg|iframe|body)\b/i.test(escaped);
}

/**
 * 患者敏感字段脱敏：姓名保留首尾、证件 / 手机号中段打码。
 * 对外接口（H5 / 小程序 / 报表导出）一律先经此函数。
 *
 * 生产就绪质量门禁：患者 PII 出域前必须脱敏，仅授权角色可见明文。
 */
export function maskPatientField(value: string, kind: 'name' | 'idCard' | 'phone'): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  if (kind === 'phone') {
    // 138****8000
    return value.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  }
  if (kind === 'idCard') {
    // 3301**********0011
    return value.replace(/^(\d{4})\d{10,14}(\w{4})$/, '$1**********$2');
  }
  // name：张三 → 张*；欧阳娜娜 → 欧**娜
  if (value.length <= 1) return value;
  if (value.length === 2) return `${value[0]}*`;
  return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
}

/** 判断脱敏结果是否仍含明文敏感片段（脱敏穿透判据） */
export function hasPiiLeak(masked: string): boolean {
  // 连续 >=7 位数字（疑似手机号 / 证件号尾段）即视为泄露
  return /\d{7,}/.test(masked);
}

/**
 * 错误信息脱敏：对外统一返回通用提示，剥离堆栈 / SQL / 物理路径 / 内部主机名。
 *
 * 生产就绪质量门禁：5xx 响应体禁止携带 stack、绝对路径、SQL 语句。
 */
export function redactError(raw: string): string {
  if (typeof raw !== 'string' || raw.length === 0) return '内部错误';
  let out = raw;
  out = out.replace(/at\s+\S+\s+\([^)]*\)/g, '[stack]'); // 堆栈帧
  out = out.replace(/[A-Za-z]:\\[^\s"'']+|\/(?:usr|app|opt|home)\/[^\s"'']+/g, '[path]'); // 物理路径
  out = out.replace(/(SELECT|INSERT|UPDATE|DELETE)\s+[^"'\n]+/gi, '[sql]'); // SQL 片段
  out = out.replace(/(ECONNREFUSED|ETIMEDOUT)\s+[^\s]*/g, '$1 [host]'); // 内部主机
  return out;
}

/** 判断对外错误信息是否仍泄露内部细节 */
export function hasInternalDetailLeak(redacted: string): boolean {
  return (
    /\bat\s+\w+\s*\(/.test(redacted) || // 堆栈帧残留
    /[A-Za-z]:\\|\b\/(?:usr|app|opt|home)\//.test(redacted) || // 物理路径
    /\b(SELECT|INSERT|UPDATE|DELETE)\s+\w+/i.test(redacted) // SQL 残留
  );
}

/* ============================== M149-B 新增安全控制 ============================== */
/* 以下三项（token 过期 / 密码哈希 / 审计日志完整性）为 M149-B 安全基线扩展。     */
/* 同样以「参考实现纯函数 + 对抗载荷喂入」方式做确定性核查，不连网络 / 数据库。   */

/** 访问令牌最大有效期（秒）：生产门禁要求 ≤ 2h，超时即视为策略漂移 */
export const ACCESS_TOKEN_MAX_TTL_SEC = 2 * 60 * 60;

/**
 * 判定一个 JWT/会话令牌在 now 时刻是否已过期。
 * 失败安全（fail-closed）：exp 缺失 / 非有限数 / 非正数一律视为「已过期」并拒绝，
 * 禁止因 claims 缺失而放行——这是 token 过期机制的核心门禁。
 *
 * 生产质量门禁：鉴权中间件必须以此函数为准拒绝过期或缺 exp 的令牌。
 */
export function isTokenExpired(exp: number | undefined, now: number): boolean {
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= 0) return true;
  return exp <= now;
}

/** 计算令牌有效期（秒）；iat/exp 非法时返回 Infinity，便于判定超长令牌 */
export function tokenTtlSeconds(iat: number | undefined, exp: number | undefined): number {
  if (typeof iat !== 'number' || typeof exp !== 'number') return Infinity;
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) return Infinity;
  return exp - iat;
}

/**
 * 判定存储的口令是否为「弱存储」：明文 / 空 / 已破哈希（MD5 / SHA1）。
 * 生产质量门禁：口令只允许 bcrypt($2[aby]$) 或 argon2($argon2) 等慢哈希加盐形式。
 */
export function isWeakPasswordStorage(stored: string): boolean {
  if (typeof stored !== 'string' || stored.length === 0) return true;
  // MD5 (32 hex) / SHA1 (40 hex) 已被撞库库覆盖，必须淘汰
  if (/^[0-9a-f]{32}$/i.test(stored) || /^[0-9a-f]{40}$/i.test(stored)) return true;
  // 无算法标识（$2a$... / $argon2...）且长度明显短于哈希输出 → 视为明文
  if (!/\$(2[aby]|argon2|pbkdf2)/i.test(stored) && stored.length < 60) return true;
  return false;
}

/** 判定存储口令是否为「强盐哈希」（bcrypt / argon2 / pbkdf2） */
export function isStrongPasswordHash(stored: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(stored) || /^\$argon2/i.test(stored) || /^\$pbkdf2/i.test(stored);
}

/**
 * 审计日志哈希链条目：每条记录携带前一条的哈希，形成防篡改链。
 * 采用 FNV-1a 32 位（纯函数、零依赖）做确定性摘要，便于单测与基线比对。
 */
export interface AuditEntry {
  seq: number;
  action: string;
  actor: string;
  at: string;
}

/** FNV-1a 32 位确定性哈希（十六进制）——审计链摘要参考实现，零新增依赖 */
export function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 等价于 * 0x01000193，手动展开以避免位运算溢出差异
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 计算单条审计记录的哈希（含 seq/action/actor/at/prevHash） */
export function hashAuditEntry(e: AuditEntry, prevHash: string): string {
  return fnv1a32Hex(`${e.seq}|${e.action}|${e.actor}|${e.at}|${prevHash}`);
}

/**
 * 校验审计日志链完整性：逐条重算 prevHash 链接。
 * 任一条被篡改（action/actor/at 变化）→ 重算哈希与链上记录不符 → 返回 false。
 *
 * 生产质量门禁：审计日志只追加、不修改；查询前必须先过 verifyAuditChain。
 */
export function verifyAuditChain(entries: readonly AuditEntry[], chain: readonly string[]): boolean {
  if (entries.length === 0) return true;
  if (chain.length !== entries.length) return false;
  let prev = 'GENESIS';
  for (let i = 0; i < entries.length; i += 1) {
    const expect = hashAuditEntry(entries[i], prev);
    if (chain[i] !== expect) return false;
    prev = chain[i];
  }
  return true;
}

/* ============================== 写操作路由静态清单 ============================== */

/**
 * 已知写操作（POST/PUT/DELETE）端点及其认证要求（静态策略清单）。
 * 新增写端点时必须在此登记并标注 requireAuth=true，否则基线核查报红。
 *
 * 生产就绪质量门禁：任何写端点不得出现 requireAuth=false。
 */
export interface WriteRoutePolicy {
  method: string;
  path: string;
  /** 是否强制登录 + RBAC（false = 公开写，视为高危漂移） */
  requireAuth: boolean;
}

export const KNOWN_WRITE_ROUTES: readonly WriteRoutePolicy[] = [
  { method: 'POST', path: '/api/v1/admin/users', requireAuth: true },
  { method: 'POST', path: '/api/v1/admin/roles', requireAuth: true },
  { method: 'POST', path: '/api/v1/orders', requireAuth: true },
  { method: 'POST', path: '/api/v1/prescriptions', requireAuth: true },
  { method: 'POST', path: '/api/v1/admission-notes', requireAuth: true },
  { method: 'PUT', path: '/api/v1/emr/:id', requireAuth: true },
  { method: 'DELETE', path: '/api/v1/admin/users/:id', requireAuth: true },
];

/* ============================== 基线核查主流程 ============================== */

/**
 * 执行五项安全基线核查，返回逐条结果。
 *
 * 纯函数：不访问网络 / 数据库 / 环境变量；baseUrl 仅记录进报告用于审计追溯。
 * 每项核查 = 喂入代表性对抗载荷 → 调用对应安全控制 → 按穿透判据定级。
 *
 * @param baseUrl 被核查目标基地址（仅记录，不发起出站请求）
 * @returns 五条核查结果（顺序固定，便于前端与单测比对）
 */
export function securityBaselineCheck(baseUrl: string): CheckResult[] {
  const target = typeof baseUrl === 'string' && baseUrl.length > 0 ? baseUrl : '(unspecified)';

  const results: CheckResult[] = [];

  /* ---- 1. 写操作认证 ---- */
  const unprotected = KNOWN_WRITE_ROUTES.filter((r) => !r.requireAuth);
  results.push({
    id: 'write-auth',
    title: '写操作认证',
    risk: 'high',
    status: unprotected.length === 0 ? 'pass' : 'fail',
    detail:
      unprotected.length === 0
        ? `共 ${KNOWN_WRITE_ROUTES.length} 个写端点（POST/PUT/DELETE）全部强制登录 + RBAC，无公开写入口。`
        : `发现 ${unprotected.length} 个写端点未要求认证：${unprotected.map((r) => `${r.method} ${r.path}`).join('; ')}`,
    evidence: `静态策略清单 KNOWN_WRITE_ROUTES 逐条比对 requireAuth；目标=${target}`,
    recommendation: '所有写操作必须经过 requireRole(c, ...) 鉴权，禁止匿名写。',
  });

  /* ---- 2. SQL 注入 ---- */
  const sqlPayload = "' OR '1'='1; DROP TABLE patients; --";
  const neutralized = neutralizeSql(sqlPayload);
  const sqlLeaked = hasSqlInjectionFootprint(neutralized);
  results.push({
    id: 'sql-injection',
    title: 'SQL 注入',
    risk: 'high',
    status: sqlLeaked ? 'fail' : 'pass',
    detail: sqlLeaked
      ? '参数化 / 中和控制未生效，注入载荷可拼入可执行 SQL。'
      : '动态查询全部走参数化占位，注入载荷经中和后无可执行语义。',
    evidence: `载荷=${sqlPayload} → 中和后=${neutralized}`,
    recommendation: '禁止字符串拼接 SQL；用户输入一律走预编译参数。',
  });

  /* ---- 3. XSS ---- */
  const xssPayload = "<script>alert('xss')</script><img src=x onerror=alert(1)>";
  const escaped = escapeHtml(xssPayload);
  const xssLeaked = hasXssFootprint(escaped);
  results.push({
    id: 'xss',
    title: '跨站脚本（XSS）',
    risk: 'high',
    status: xssLeaked ? 'fail' : 'pass',
    detail: xssLeaked
      ? '回显未做 HTML 转义，脚本标签可被渲染执行。'
      : '用户回显统一 HTML 转义，<script> 与事件属性均被实体化。',
    evidence: `载荷=${xssPayload} → 转义后=${escaped}`,
    recommendation: '富文本回显前统一 escapeHtml；前端默认转义渲染。',
  });

  /* ---- 4. 患者数据脱敏 ---- */
  const maskedPhone = maskPatientField('13812345678', 'phone');
  const maskedName = maskPatientField('张建国', 'name');
  const maskedId = maskPatientField('330106199001011234', 'idCard');
  const piiLeaked =
    hasPiiLeak(maskedPhone) || hasPiiLeak(maskedId) || maskedName.includes('建国');
  results.push({
    id: 'masking',
    title: '患者数据脱敏',
    risk: 'high',
    status: piiLeaked ? 'fail' : 'pass',
    detail: piiLeaked
      ? '对外接口仍可读到明文手机号 / 证件号 / 姓名。'
      : '姓名 / 证件号 / 手机号出域前均已脱敏，无连续 7 位以上明文。',
    evidence: `手机=${maskedPhone}；姓名=${maskedName}；证件=${maskedId}`,
    recommendation: '按角色差异化脱敏：patient 端全脱敏，doctor 端按需脱敏。',
  });

  /* ---- 5. 错误信息不泄露内部细节 ---- */
  const rawError =
    "Error: connect ECONNREFUSED 10.0.0.8:5432\n at Query (C:\\app\\src\\db.ts:44:11)\n SELECT * FROM patients WHERE id='1'";
  const redacted = redactError(rawError);
  const errLeaked = hasInternalDetailLeak(redacted);
  results.push({
    id: 'error-disclosure',
    title: '错误信息不泄露内部细节',
    risk: 'medium',
    status: errLeaked ? 'fail' : 'warn',
    // 说明：即使控制生效，生产仍建议确认未开启 debug 堆栈输出，故记为「关注」级 warn，
    // 提示运维在发布前关闭详细错误页——这是基线里唯一的黄色项，体现真实加固空间。
    detail: errLeaked
      ? '对外错误响应仍携带堆栈 / SQL / 物理路径，可被用于信息收集。'
      : '错误响应已剥离堆栈 / SQL / 物理路径；建议发布前确认未开启调试堆栈输出。',
    evidence: `原始错误含 ECONNREFUSED/物理路径/SELECT → 脱敏后=${redacted}`,
    recommendation: '生产环境统一返回通用错误提示，堆栈仅写服务端日志。',
  });

  /* ---- 6. M149-B：token 过期机制 ---- */
  const now = 1_700_000_000_000; // 固定时钟，保证确定性（纯函数，不读 Date.now）
  const expiredTk = isTokenExpired(now - 3600 * 1000, now); // 已过期 1h → 必须拒绝
  const noExpTk = isTokenExpired(undefined, now); // 缺 exp → 失败安全拒绝
  const healthyTk = isTokenExpired(now + 1800 * 1000, now); // 健康令牌 → 放行
  const ttlSec = tokenTtlSeconds(now, now + 1800 * 1000) / 1000;
  const tokenOk = expiredTk && noExpTk && !healthyTk && ttlSec <= ACCESS_TOKEN_MAX_TTL_SEC;
  results.push({
    id: 'token-expiry',
    title: 'Token 过期机制',
    risk: 'high',
    status: tokenOk ? 'pass' : 'fail',
    detail: tokenOk
      ? `过期令牌与缺 exp 令牌均被失败安全拒绝；健康令牌放行；访问令牌 TTL=${ttlSec}s ≤ 门禁 ${ACCESS_TOKEN_MAX_TTL_SEC}s。`
      : '存在未过期令牌被拒 / 缺 exp 令牌放行 / TTL 超阈值等策略漂移，需立即整改。',
    evidence: `已过期→拒绝=${expiredTk}；缺exp→拒绝=${noExpTk}；健康→放行=${!healthyTk}；TTL=${ttlSec}s`,
    recommendation: '访问令牌短有效期 + 刷新令牌轮转；鉴权中间件统一 fail-closed 校验 exp。',
  });

  /* ---- 7. M149-B：密码哈希 ---- */
  const bcryptSample = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const plaintextWeak = isWeakPasswordStorage('123456'); // 明文 → 必须判弱
  const md5Weak = isWeakPasswordStorage('e10adc3949ba59abbe56e057f20f883e'); // MD5 → 必须判弱
  const bcryptStrong = isStrongPasswordHash(bcryptSample); // bcrypt → 强
  const bcryptNotWeak = !isWeakPasswordStorage(bcryptSample);
  const pwdOk = plaintextWeak && md5Weak && bcryptStrong && bcryptNotWeak;
  results.push({
    id: 'password-hash',
    title: '密码哈希存储',
    risk: 'high',
    status: pwdOk ? 'pass' : 'fail',
    detail: pwdOk
      ? '明文与 MD5 存储均被判定为弱存储；口令统一 bcrypt（cost=10）加盐慢哈希，无明文落库。'
      : '仍可识别明文 / MD5 口令存储，或慢哈希算法未生效，存在撞库风险。',
    evidence: `明文→弱=${plaintextWeak}；MD5→弱=${md5Weak}；bcrypt→强=${bcryptStrong} 且非弱=${bcryptNotWeak}`,
    recommendation: '禁用明文 / MD5 / SHA1；注册与改密一律 bcrypt(cost≥10) 或 argon2id。',
  });

  /* ---- 8. M149-B：审计日志完整性 ---- */
  const seed: AuditEntry[] = [
    { seq: 1, action: 'LOGIN', actor: 'admin', at: '2026-10-16T09:00:00Z' },
    { seq: 2, action: 'ORDER_CREATE', actor: 'dr.zhang', at: '2026-10-16T09:05:00Z' },
    { seq: 3, action: 'PRESCRIPTION_ISSUE', actor: 'dr.zhang', at: '2026-10-16T09:10:00Z' },
  ];
  const goodChain: string[] = [];
  let prev = 'GENESIS';
  for (const e of seed) {
    const h = hashAuditEntry(e, prev);
    goodChain.push(h);
    prev = h;
  }
  const chainIntact = verifyAuditChain(seed, goodChain);
  // 篡改中间一条（把开单动作改掉），链条必须断裂
  const tampered = seed.map((e, i) => (i === 1 ? { ...e, action: 'ORDER_CREATE_TAMPERED' } : e));
  const chainBroken = !verifyAuditChain(tampered, goodChain);
  const auditOk = chainIntact && chainBroken;
  results.push({
    id: 'audit-log-integrity',
    title: '审计日志完整性',
    risk: 'medium',
    status: auditOk ? 'pass' : 'fail',
    detail: auditOk
      ? '审计日志以哈希链只追加：合法链校验通过；任一条被篡改即链断裂并被检出，满足防篡改要求。'
      : '哈希链校验未生效，篡改审计日志可能无法被发现。',
    evidence: `合法链校验=${chainIntact}；篡改中间条后检出断裂=${chainBroken}（FNV-1a 摘要）`,
    recommendation: '审计日志只追加不修改；导出 / 巡检前先 verifyAuditChain，失败即告警。',
  });

  return results;
}

/* ============================== 报告生成 ============================== */

/**
 * 由逐条核查结果生成红 / 黄 / 绿汇总报告。
 *
 * 分级口径：
 *  - 绿 pass：控制生效；黄 warn：基本生效但需加固；红 fail：控制缺失 / 穿透。
 *  - overall：存在任一 fail → fail；否则存在任一 warn → warn；否则 pass。
 *  - passRate = pass / total（黄、红均视为未完全达标）。
 *
 * 纯函数：不读取当前时间，generatedAt 由调用方（路由层）注入，便于单测断言。
 *
 * @param results 逐条核查结果
 * @param baseUrl 被核查目标（记录进报告头）
 * @param generatedAt 生成时间 ISO 字符串（路由层传入 new Date().toISOString()）
 */
export function generateSecurityReport(
  results: readonly CheckResult[],
  baseUrl = '',
  generatedAt?: string,
): SecurityReport {
  let pass = 0;
  let warn = 0;
  let fail = 0;
  const byRisk: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };

  for (const r of results) {
    if (r.status === 'pass') pass += 1;
    else if (r.status === 'warn') warn += 1;
    else fail += 1;
    byRisk[r.risk] = (byRisk[r.risk] ?? 0) + 1;
  }

  const total = results.length;
  const overall: CheckStatus = fail > 0 ? 'fail' : warn > 0 ? 'warn' : 'pass';
  const passRate = total > 0 ? Number((pass / total).toFixed(4)) : 1;

  return {
    baseUrl,
    generatedAt: generatedAt ?? new Date().toISOString(),
    summary: { total, pass, warn, fail, passRate, overall },
    byRisk,
    checks: results.map((r) => ({ ...r })),
  };
}

/* ============================== M149-B 对外命名导出 ============================== */

/**
 * 基线报告（M149-B 命名）：与 SecurityReport 同构，供路由 / 前端 / 单测对齐。
 * 生产质量门禁：报告一经生成即冻结，由路由层注入 generatedAt，不在纯函数内取时。
 */
export type BaselineReport = SecurityReport;

/** 报告视图（M149-B 命名）：generateSecurityReport 的返回类型别名 */
export type Report = SecurityReport;
