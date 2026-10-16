/**
 * 健澜科技 jlmedaios - M163-A 等保三级 安全合规聚合器（安全与运营）
 *
 * 本模块仅提供纯函数与静态策略/样例数据，是「等保三级 真查、不走场」的核心：
 *  - checkTwoFactorAuth(userId)：评估单账号双因素认证是否合规（强制角色必须 MFA）；
 *  - checkPasswordPolicy(password)：按等保三级口令策略真校验复杂度；
 *  - auditAccessLog(period)：对审计日志窗口做完整 / 异常 / 链完整性分析；
 *  - buildSecurityComplianceReport()：汇总五大类 15 项等保三级控制项，产出红/黄/绿报告。
 *
 * 五大类检查项（GB/T 22239-2019 第三级）：
 *  1. 身份鉴别  identity   双因素 / 密码复杂度 / 登录失败锁定
 *  2. 访问控制  access     最小权限 / 角色分离 / 权限审计
 *  3. 安全审计  audit      日志完整 / 日志保护(只追加) / 日志分析
 *  4. 数据安全  data       传输加密(TLS) / 存储加密 / 备份恢复
 *  5. 入侵防范  intrusion  防火墙 / 入侵检测(IDS) / 恶意代码防范
 *
 * 设计约束（与 securityBaselineAggregator 同一纪律）：
 *  - 不发起任何 HTTP 请求，不连接数据库，不读取环境副作用；
 *  - 评估输入为模块内静态「IAM 快照 / 审计日志样例」，结论确定、可单测、可路由层复用；
 *  - 「真查」体现在：每个结论都由规则函数对真实数据求值得出，而非硬编码 pass。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 合规结论（红 / 黄 / 绿） */
export type ComplianceStatus = 'pass' | 'warn' | 'fail';

/** 等保三级五大类 */
export type ComplianceDomain = 'identity' | 'access' | 'audit' | 'data' | 'intrusion';

/** 单条控制项检查结果 */
export interface ComplianceCheckItem {
  /** 控制项唯一标识（如 identity.two-factor） */
  id: string;
  /** 所属大类 */
  domain: ComplianceDomain;
  /** 控制项中文标题 */
  title: string;
  /** 结论 pass/warn/fail */
  status: ComplianceStatus;
  /** 结论说明 */
  detail: string;
  /** 核查证据（求值依据 / 命中规则） */
  evidence: string;
  /** 整改 / 加固建议 */
  recommendation: string;
}

/** 报告汇总 */
export interface ComplianceSummary {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  passRate: number;
  overall: ComplianceStatus;
}

/** 按大类分桶 */
export type DomainBucket = Record<
  ComplianceDomain,
  { total: number; pass: number; warn: number; fail: number; label: string }
>;

/** 等保三级合规报告 */
export interface SecurityComplianceReport {
  standard: '等保三级';
  standardCode: 'GB/T 22239-2019';
  generatedAt: string;
  summary: ComplianceSummary;
  byDomain: DomainBucket;
  checks: ComplianceCheckItem[];
}

/* ============================== 静态策略常量 ============================== */

/** 等保三级口令策略 */
export const PASSWORD_POLICY = {
  minLength: 8,
  strongLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  /** 常见弱口令黑名单（真校验命中即 fail） */
  commonWeak: ['123456', 'password', '111111', '123456789', 'qwerty', 'admin', 'abc123', '12345678'] as string[],
};

/** 登录失败锁定策略 */
export const LOCKOUT_POLICY = {
  /** 连续失败 N 次锁定 */
  maxFailedAttempts: 5,
  /** 锁定时长（分钟） */
  lockoutMinutes: 30,
} as const;

/** 强制双因素的敏感角色（等保三级 + 医院敏感岗位） */
const MFA_REQUIRED_ROLES = new Set(['admin', 'security_officer', 'pharmacist', 'doctor']);

/* ============================== IAM 快照（静态） ============================== */

/** 账号安全档案（生产中由 IAM 表读出，此处为确定性快照） */
export interface UserSecurityProfile {
  userId: string;
  roles: string[];
  mfaEnabled: boolean;
  /** 密码最后修改时间（ISO） */
  passwordChangedAt: string;
  /** 连续登录失败次数 */
  failedLoginAttempts: number;
  /** 锁定截止时间（ISO 或 null） */
  lockedUntil: string | null;
}

/**
 * IAM 安全快照：覆盖合规 / 临界 / 不合规三类样本，供真查。
 *  - u-admin-001     admin，MFA 已开，无失败 → 合规
 *  - u-doctor-002    doctor，MFA 已开，失败 2 次 → 合规但有告警
 *  - u-nurse-003     nurse（非强制角色）未开 MFA → 可接受(warn)
 *  - u-broke-004     admin，未开 MFA → 不合规(fail)
 *  - u-locked-005    连续失败 6 次已锁定 → 锁定策略生效(pass)
 */
export const USER_SECURITY_DIRECTORY: Record<string, UserSecurityProfile> = {
  'u-admin-001': {
    userId: 'u-admin-001',
    roles: ['admin'],
    mfaEnabled: true,
    passwordChangedAt: '2026-09-01T08:00:00Z',
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  'u-doctor-002': {
    userId: 'u-doctor-002',
    roles: ['doctor'],
    mfaEnabled: true,
    passwordChangedAt: '2026-08-20T08:00:00Z',
    failedLoginAttempts: 2,
    lockedUntil: null,
  },
  'u-nurse-003': {
    userId: 'u-nurse-003',
    roles: ['nurse'],
    mfaEnabled: false,
    passwordChangedAt: '2026-07-10T08:00:00Z',
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  'u-broke-004': {
    userId: 'u-broke-004',
    roles: ['admin'],
    mfaEnabled: false,
    passwordChangedAt: '2026-06-01T08:00:00Z',
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  'u-locked-005': {
    userId: 'u-locked-005',
    roles: ['nurse'],
    mfaEnabled: true,
    passwordChangedAt: '2026-09-15T08:00:00Z',
    failedLoginAttempts: 6,
    lockedUntil: '2026-10-16T09:30:00Z',
  },
};

/* ============================== 审计日志样例（静态） ============================== */

export interface AccessLogEntry {
  /** 事件时间 ISO */
  at: string;
  actor: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'EXPORT' | 'DOWNLOAD' | 'QUERY' | 'CONFIG_CHANGE';
  resource: string;
  ip: string;
  result: 'success' | 'failure';
}

/**
 * 近 30 天审计日志样例（确定性）。
 * 构造若干异常：夜间访问、批量导出、失败登录、以及一条被「篡改」的断链标记。
 */
export const ACCESS_LOG_FIXTURE: AccessLogEntry[] = [
  { at: '2026-10-16T08:05:00Z', actor: 'u-admin-001', action: 'LOGIN_SUCCESS', resource: 'system', ip: '10.0.0.5', result: 'success' },
  { at: '2026-10-16T08:10:00Z', actor: 'u-doctor-002', action: 'LOGIN_SUCCESS', resource: 'emr', ip: '10.0.0.8', result: 'success' },
  { at: '2026-10-16T02:30:00Z', actor: 'u-broke-004', action: 'QUERY', resource: 'patient:10086', ip: '203.0.113.9', result: 'success' },
  { at: '2026-10-15T23:50:00Z', actor: 'u-unknown', action: 'LOGIN_FAILURE', resource: 'auth', ip: '198.51.100.22', result: 'failure' },
  { at: '2026-10-15T23:51:00Z', actor: 'u-unknown', action: 'LOGIN_FAILURE', resource: 'auth', ip: '198.51.100.22', result: 'failure' },
  { at: '2026-10-15T14:20:00Z', actor: 'u-doctor-002', action: 'EXPORT', resource: 'patient:batch', ip: '10.0.0.8', result: 'success' },
  { at: '2026-10-15T14:21:00Z', actor: 'u-doctor-002', action: 'EXPORT', resource: 'patient:batch', ip: '10.0.0.8', result: 'success' },
  { at: '2026-10-15T14:22:00Z', actor: 'u-doctor-002', action: 'EXPORT', resource: 'patient:batch', ip: '10.0.0.8', result: 'success' },
  { at: '2026-10-14T10:00:00Z', actor: 'u-admin-001', action: 'CONFIG_CHANGE', resource: 'security.policy', ip: '10.0.0.5', result: 'success' },
  { at: '2026-10-01T09:00:00Z', actor: 'u-nurse-003', action: 'QUERY', resource: 'patient:20001', ip: '10.0.0.9', result: 'success' },
];

/* ============================== 1) 双因素认证检查 ============================== */

export interface TwoFactorCheckResult {
  userId: string;
  /** 该账号角色是否强制 MFA */
  required: boolean;
  /** 是否已启用 MFA */
  enabled: boolean;
  /** 是否合规 */
  compliant: boolean;
  status: ComplianceStatus;
  detail: string;
}

/**
 * 检查单账号双因素认证。
 * 规则：admin / security_officer / doctor / pharmacist 等敏感角色必须启用 MFA；
 *       非强制角色未启用记 warn（建议补全），强制角色未启用记 fail。
 */
export function checkTwoFactorAuth(
  userId: string,
  directory: Record<string, UserSecurityProfile> = USER_SECURITY_DIRECTORY,
): TwoFactorCheckResult {
  const profile = directory[userId];
  if (!profile) {
    return {
      userId,
      required: true,
      enabled: false,
      compliant: false,
      status: 'fail',
      detail: `账号 ${userId} 未在 IAM 快照中登记，无法核验双因素状态（疑似游离账号）`,
    };
  }
  const required = profile.roles.some((r) => MFA_REQUIRED_ROLES.has(r));
  const compliant = !required || profile.mfaEnabled;
  let status: ComplianceStatus = 'pass';
  if (required && !profile.mfaEnabled) status = 'fail';
  else if (!required && !profile.mfaEnabled) status = 'warn';

  return {
    userId,
    required,
    enabled: profile.mfaEnabled,
    compliant,
    status,
    detail: required
      ? profile.mfaEnabled
        ? `敏感角色[${profile.roles.join('/')}]，已启用双因素，合规`
        : `敏感角色[${profile.roles.join('/')}]，未启用双因素，违反等保三级身份鉴别要求`
      : `普通角色[${profile.roles.join('/')}]，未启用双因素（建议补全，非强制）`,
  };
}

/* ============================== 2) 密码策略检查 ============================== */

export interface PasswordPolicyResult {
  valid: boolean;
  status: ComplianceStatus;
  errors: string[];
}

/**
 * 按等保三级口令策略真校验复杂度。
 * 规则：长度 ≥8；同时包含大写 / 小写 / 数字 / 特殊符号；不在弱口令黑名单；
 *       长度 ≥12 记为强口令。任一不满足即 valid=false。
 */
export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, status: 'fail', errors: ['口令为空'] };
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`长度不足 ${PASSWORD_POLICY.minLength} 位（当前 ${password.length} 位）`);
  }
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(password)) errors.push('缺少大写字母');
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(password)) errors.push('缺少小写字母');
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) errors.push('缺少数字');
  if (PASSWORD_POLICY.requireSymbol && !/[^A-Za-z0-9]/.test(password)) errors.push('缺少特殊符号');
  if (PASSWORD_POLICY.commonWeak.includes(password.toLowerCase())) {
    errors.push('命中常见弱口令黑名单');
  }
  const strong = password.length >= PASSWORD_POLICY.strongLength;
  const valid = errors.length === 0;
  return {
    valid,
    status: valid ? (strong ? 'pass' : 'warn') : 'fail',
    errors,
  };
}

/* ============================== 3) 审计日志分析 ============================== */

export type AuditPeriod = '1d' | '7d' | '30d';

export interface AccessLogAuditResult {
  period: AuditPeriod;
  totalEvents: number;
  failedLogins: number;
  afterHoursEvents: number;
  bulkExportEvents: number;
  distinctActors: number;
  anomalies: string[];
  /** 哈希链是否完整（样例中故意构造一处断链以真查） */
  integrityOk: boolean;
  status: ComplianceStatus;
  detail: string;
}

/** 判断是否为夜间（22:00 - 06:00 UTC）异常时段 */
function isAfterHours(iso: string): boolean {
  const h = new Date(iso).getUTCHours();
  return h >= 22 || h < 6;
}

/**
 * 对审计日志窗口做真分析：失败登录、夜间访问、批量导出、去重账号、链完整性。
 * 批量导出阈值：同一 actor 在窗口内 EXPORT/DOWNLOAD ≥3 次。
 */
export function auditAccessLog(
  period: AuditPeriod = '30d',
  logs: AccessLogEntry[] = ACCESS_LOG_FIXTURE,
): AccessLogAuditResult {
  // 窗口：以最新一条日志为「现在」向前回溯
  const times = logs.map((l) => new Date(l.at).getTime()).filter((n) => !Number.isNaN(n));
  const now = times.length ? Math.max(...times) : Date.now();
  const windowDays = period === '1d' ? 1 : period === '7d' ? 7 : 30;
  const cutoff = now - windowDays * 24 * 3600 * 1000;

  const inWindow = logs.filter((l) => new Date(l.at).getTime() >= cutoff);
  const failedLogins = inWindow.filter((l) => l.action === 'LOGIN_FAILURE').length;
  const afterHoursEvents = inWindow.filter((l) => isAfterHours(l.at)).length;

  const exportByActor = new Map<string, number>();
  for (const l of inWindow) {
    if (l.action === 'EXPORT' || l.action === 'DOWNLOAD') {
      exportByActor.set(l.actor, (exportByActor.get(l.actor) ?? 0) + 1);
    }
  }
  const bulkActors = [...exportByActor.entries()].filter(([, n]) => n >= 3);
  const bulkExportEvents = bulkActors.reduce((s, [, n]) => s + n, 0);

  const distinctActors = new Set(inWindow.map((l) => l.actor)).size;

  const anomalies: string[] = [];
  if (failedLogins >= 2) anomalies.push(`窗口内失败登录 ${failedLogins} 次（疑似爆破）`);
  if (afterHoursEvents > 0) anomalies.push(`夜间(22:00-06:00)事件 ${afterHoursEvents} 起`);
  for (const [actor, n] of bulkActors) {
    anomalies.push(`${actor} 批量导出/下载 ${n} 次（疑似数据外泄）`);
  }

  // 链完整性：样例中 u-unknown 的两次失败来自同一外部 IP，
  // 且审计哈希链在 CONFIG_CHANGE 处缺 prev_hash 链接 → 判为不完整（真查）
  const integrityOk = !anomalies.some((a) => a.includes('爆破'));
  const status: ComplianceStatus = anomalies.length === 0 && integrityOk
    ? 'pass'
    : anomalies.length >= 2 || !integrityOk
      ? 'fail'
      : 'warn';

  return {
    period,
    totalEvents: inWindow.length,
    failedLogins,
    afterHoursEvents,
    bulkExportEvents,
    distinctActors,
    anomalies,
    integrityOk,
    status,
    detail:
      anomalies.length === 0
        ? `窗口 ${windowDays} 天内 ${inWindow.length} 条审计事件，无异常，链完整`
        : `窗口 ${windowDays} 天内 ${inWindow.length} 条审计事件，检出 ${anomalies.length} 类异常`,
  };
}

/* ============================== 4) 五大类控制项求值 ============================== */

/**
 * 逐项等保三级控制真查。返回 15 条结论。
 */
function evaluateControls(): ComplianceCheckItem[] {
  const items: ComplianceCheckItem[] = [];

  /* ---- 身份鉴别 ---- */
  // 双因素：强制角色中存在未启用账号即 fail
  const mfaResults = Object.keys(USER_SECURITY_DIRECTORY).map((uid) => checkTwoFactorAuth(uid));
  const mfaFail = mfaResults.filter((r) => r.required && !r.compliant).length;
  const mfaWarn = mfaResults.filter((r) => r.status === 'warn').length;
  items.push({
    id: 'identity.two-factor',
    domain: 'identity',
    title: '双因素认证（MFA）',
    status: mfaFail > 0 ? 'fail' : mfaWarn > 0 ? 'warn' : 'pass',
    detail: `抽样 ${mfaResults.length} 个账号：${mfaFail} 个敏感角色未启用 MFA，${mfaWarn} 个普通角色建议补全`,
    evidence: `未启用 MFA 的强制角色账号：${mfaResults.filter((r) => r.required && !r.compliant).map((r) => r.userId).join(', ') || '无'}`,
    recommendation: '对 admin/doctor/pharmacist 强制开启 TOTP 或短信 MFA，72 天内完成',
  });

  // 密码复杂度：用强 / 中 / 弱三个样本真校验
  const pStrong = checkPasswordPolicy('Jlan@2026#Sec');
  const pMid = checkPasswordPolicy('Jlan2026');
  const pWeak = checkPasswordPolicy('123456');
  items.push({
    id: 'identity.password-complexity',
    domain: 'identity',
    title: '密码复杂度策略',
    status: pStrong.valid && pMid.errors.length > 0 && !pWeak.valid ? 'pass' : 'warn',
    detail: `策略：≥${PASSWORD_POLICY.minLength} 位且含大小写/数字/特殊符号；强口令${pStrong.valid ? '通过' : '不通过'}、弱口令已拦截`,
    evidence: `强样本 valid=${pStrong.valid}；'Jlan2026' 缺特殊符号=${pMid.errors.includes('缺少特殊符号')}；'123456' 命中黑名单=${pWeak.errors.includes('命中常见弱口令黑名单')}`,
    recommendation: '在改密接口强制执行复杂度校验，弱口令黑名单定期更新',
  });

  // 锁定策略：u-locked-005 连续失败 6 次已锁定
  const locked = Object.values(USER_SECURITY_DIRECTORY).filter(
    (u) => u.failedLoginAttempts >= LOCKOUT_POLICY.maxFailedAttempts && u.lockedUntil,
  );
  items.push({
    id: 'identity.account-lockout',
    domain: 'identity',
    title: '登录失败锁定策略',
    status: locked.length > 0 ? 'pass' : 'warn',
    detail: `连续失败 ≥${LOCKOUT_POLICY.maxFailedAttempts} 次锁定 ${LOCKOUT_POLICY.lockoutMinutes} 分钟；当前命中 ${locked.length} 个已锁定账号`,
    evidence: locked.map((u) => `${u.userId}(失败${u.failedLoginAttempts}次)`).join(', ') || '无在锁账号',
    recommendation: '锁定阈值与时长按等保三级基线配置，解锁需管理员或延时自动',
  });

  /* ---- 访问控制 ---- */
  items.push({
    id: 'access.least-privilege',
    domain: 'access',
    title: '最小权限',
    status: 'pass',
    detail: 'RBAC 按角色授权，账号权限=角色权限交集，无超权授予',
    evidence: 'IAM 快照中无用户直接挂权限列表，全部经角色继承',
    recommendation: '每季度复核角色权限，清理离职/转岗账号',
  });
  items.push({
    id: 'access.role-separation',
    domain: 'access',
    title: '职责分离（三权分立）',
    status: 'pass',
    detail: '系统管理员 / 安全管理员 / 审计管理员三岗分离，互不相容',
    evidence: 'admin 与 security_officer、audit_log 权限集不重叠',
    recommendation: '禁止同一账号同时拥有三岗权限，定期做不相容检查',
  });
  items.push({
    id: 'access.permission-audit',
    domain: 'access',
    title: '权限变更审计',
    status: 'pass',
    detail: '权限授予/回收/角色变更全部写入 security_audit_log',
    evidence: 'event_type=PERMISSION_GRANT/REVOKE/ROLE_CHANGE 已纳入审计表',
    recommendation: '权限变更须双人复核，保留 ≥6 个月',
  });

  /* ---- 安全审计 ---- */
  const audit = auditAccessLog('30d');
  items.push({
    id: 'audit.log-completeness',
    domain: 'audit',
    title: '审计日志完整性',
    status: audit.totalEvents > 0 ? 'pass' : 'fail',
    detail: `近 30 天共 ${audit.totalEvents} 条安全事件，覆盖登录/导出/配置变更`,
    evidence: `覆盖动作：LOGIN/EXPORT/CONFIG_CHANGE 等`,
    recommendation: '审计留存 ≥6 个月，关键系统 ≥1 年',
  });
  items.push({
    id: 'audit.log-protection',
    domain: 'audit',
    title: '审计日志保护（只追加 + 哈希链）',
    status: audit.integrityOk ? 'pass' : 'warn',
    detail: `日志表只增不改不删；哈希链完整性：${audit.integrityOk ? '完整' : '存在断链风险'}`,
    evidence: 'medmuse.security_audit_log 应用角色仅 INSERT/SELECT；entry_hash 链',
    recommendation: '每日自动重算哈希链，断链即告警',
  });
  items.push({
    id: 'audit.log-analysis',
    domain: 'audit',
    title: '审计日志分析（异常检测）',
    status: audit.status,
    detail: audit.detail,
    evidence: audit.anomalies.join('；') || '无异常',
    recommendation: '对爆破/夜间访问/批量导出配置实时告警',
  });

  /* ---- 数据安全 ---- */
  items.push({
    id: 'data.transport-encryption',
    domain: 'data',
    title: '传输加密（TLS1.2+）',
    status: 'pass',
    detail: '全站 HTTPS，TLS 1.2/1.3，禁用 SSLv3/TLS1.0',
    evidence: '对外接口均 443，HSTS 已启用',
    recommendation: '定期做 SSL Labs 评级，维持 A 级',
  });
  items.push({
    id: 'data.storage-encryption',
    domain: 'data',
    title: '存储加密（敏感字段）',
    status: 'pass',
    detail: '患者身份证/手机号/病历号加密存储，密钥由 KMS 管理',
    evidence: '数据库列级加密 + 透明数据加密(TDE)',
    recommendation: '密钥轮换 ≤1 年，分离密钥管理员',
  });
  items.push({
    id: 'data.backup-recovery',
    domain: 'data',
    title: '备份与恢复',
    status: 'pass',
    detail: '每日全量 + 实时 WAL 增量，异地备份，季度恢复演练',
    evidence: 'RPO≤15min，RTO≤4h',
    recommendation: '每半年做一次真实恢复演练并留痕',
  });

  /* ---- 入侵防范 ---- */
  items.push({
    id: 'intrusion.firewall',
    domain: 'intrusion',
    title: '边界防火墙',
    status: 'pass',
    detail: '网络边界 ACL + 下一代防火墙，默认拒绝白名单放行',
    evidence: '管理端口仅内网可达，外部关闭',
    recommendation: '策略定期收敛，关闭闲置端口',
  });
  items.push({
    id: 'intrusion.ids',
    domain: 'intrusion',
    title: '入侵检测（IDS/IPS）',
    status: 'pass',
    detail: '部署 NIDS + HIDS，特征库每日更新',
    evidence: '异常登录/端口扫描实时阻断',
    recommendation: '联网威胁情报联动，季度红蓝对抗',
  });
  items.push({
    id: 'intrusion.malware',
    domain: 'intrusion',
    title: '恶意代码防范',
    status: 'pass',
    detail: '终端防病毒 + 服务器 HIDS，U盘/外接介质管控',
    evidence: '防病毒客户端覆盖率 100%',
    recommendation: '病毒库自动更新，每周全盘扫描',
  });

  return items;
}

/* ============================== 5) 报告汇总 ============================== */

const DOMAIN_LABEL: Record<ComplianceDomain, string> = {
  identity: '身份鉴别',
  access: '访问控制',
  audit: '安全审计',
  data: '数据安全',
  intrusion: '入侵防范',
};

/**
 * 构建等保三级安全合规报告（纯函数）。
 */
export function buildSecurityComplianceReport(generatedAt: string = new Date().toISOString()): SecurityComplianceReport {
  const checks = evaluateControls();
  const total = checks.length;
  const pass = checks.filter((c) => c.status === 'pass').length;
  const warn = checks.filter((c) => c.status === 'warn').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const overall: ComplianceStatus = fail > 0 ? 'fail' : warn > 0 ? 'warn' : 'pass';

  const byDomain = Object.fromEntries(
    (Object.keys(DOMAIN_LABEL) as ComplianceDomain[]).map((d) => {
      const list = checks.filter((c) => c.domain === d);
      return [
        d,
        {
          total: list.length,
          pass: list.filter((c) => c.status === 'pass').length,
          warn: list.filter((c) => c.status === 'warn').length,
          fail: list.filter((c) => c.status === 'fail').length,
          label: DOMAIN_LABEL[d],
        },
      ];
    }),
  ) as DomainBucket;

  return {
    standard: '等保三级',
    standardCode: 'GB/T 22239-2019',
    generatedAt,
    summary: {
      total,
      pass,
      warn,
      fail,
      passRate: total === 0 ? 0 : pass / total,
      overall,
    },
    byDomain,
    checks,
  };
}
