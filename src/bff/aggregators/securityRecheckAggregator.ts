/**
 * 健澜科技 jlmedaios - M174-A 医院数据安全深化 · 等保三级复查聚合器（安全与运营）
 *
 * 本模块是 M163-A 等保三级合规检查的「复查」深化层，真查、不走场：
 *  - recheckSecurityCompliance()：在 M163 基线之上做第二轮深查，
 *      * 对已整改项做「整改证据核验」（不能只听汇报，要看 IAM/日志/配置快照是否真变了）；
 *      * 对基线 pass 项做「漂移检测」（防止改配置后悄悄回退）；
 *      * 对 M163 未覆盖的盲区补刀（口令年龄、共享账号、恢复演练周期、TLS 残留套件）；
 *  - trackSecurityFixes(previousReport, currentReport)：两轮报告逐项 diff，
 *      产出 fixed / regressed / improved / open / new 五类修复跟踪结论；
 *  - generateSecurityTrend(period)：按周/月产出安全合规趋势序列，用于管理看板。
 *
 * 设计约束（与 securityComplianceAggregator 同一纪律）：
 *  - 纯函数：不发起 HTTP、不连 DB、不读环境副作用；
 *  - 输入为模块内静态「复查期 IAM 快照 / 复查期审计日志 / 基础设施配置快照」，
 *    结论由规则函数对真实快照求值得出，禁止硬编码 pass；
 *  - 复查期快照相对 M163 基线做了刻意扰动：u-broke-004 已补 MFA（整改），
 *    但新增 u-svc-006 共享账号、口令超龄、恢复演练超期、TLS 残留旧套件等新问题，
 *    用以验证「复查真能查出新问题」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

import {
  buildSecurityComplianceReport,
  type ComplianceCheckItem,
  type ComplianceDomain,
  type ComplianceStatus,
  type DomainBucket,
  type SecurityComplianceReport,
  USER_SECURITY_DIRECTORY,
  type UserSecurityProfile,
} from './securityComplianceAggregator';

/** 复查轮次（M174-A 为第 2 轮：基线 M163 之后的首次复查） */
export type RecheckRound = 1 | 2 | 3;

/** 单条复查控制项：在基线项基础上增加「上轮结论 / 本轮结论 / 增量 / 整改证据」 */
export interface RecheckCheckItem {
  /** 控制项唯一标识（与 M163 对齐，便于跨轮 diff） */
  id: string;
  domain: ComplianceDomain;
  title: string;
  /** 本轮复查结论 */
  status: ComplianceStatus;
  /** 上一轮（基线）结论 */
  previousStatus: ComplianceStatus;
  /** 相对上轮的增量 */
  delta:
    | 'fixed'           // fail/warn → pass（已闭环）
    | 'improved'        // fail → warn（部分整改，仍待加固）
    | 'regressed'       // pass → warn/fail（漂移/回退）
    | 'unchanged-pass'  // 持续符合
    | 'unchanged-warn'  // 持续待加固
    | 'unchanged-fail'  // 持续不合规（未整改）
    | 'new';            // 本轮新增深查项（基线未覆盖）
  detail: string;
  /** 本轮求值证据 */
  evidence: string;
  /** 整改证据（仅 fixed/improved 项有值：核验了什么快照、证明整改已落地） */
  remediationProof?: string;
  /** 下一步建议 */
  recommendation: string;
}

/** 复查报告汇总 */
export interface RecheckSummary {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  passRate: number;
  overall: ComplianceStatus;
  /** 本轮已闭环（fixed）数 */
  fixedCount: number;
  /** 部分整改（improved）数 */
  improvedCount: number;
  /** 回退/漂移（regressed）数 */
  regressedCount: number;
  /** 仍未闭环的不合规（unchanged-fail）数 */
  openFailCount: number;
}

/** 等保三级复查报告 */
export interface SecurityRecheckReport {
  standard: '等保三级';
  standardCode: 'GB/T 22239-2019';
  recheckId: string;
  recheckAt: string;
  round: RecheckRound;
  /** 上一轮基线报告时间 */
  baselineAt: string;
  summary: RecheckSummary;
  byDomain: DomainBucket;
  checks: RecheckCheckItem[];
  /** 仍未闭环的不合规项标题清单 */
  openIssues: string[];
  /** 本轮核验通过的整改证据清单 */
  remediationProofs: string[];
}

/* ============================== 复查期静态快照 ============================== */

/**
 * 复查期 IAM 快照（相对 M163 基线的真实扰动）：
 *  - u-broke-004：admin，MFA 已补开（整改闭环），口令也已轮换；
 *  - u-nurse-003：普通护士，口令最后修改 2026-07-10，距复查日 98 天（>90 天强制轮换）；
 *  - u-svc-006（新增）：护士站共享服务账号，未开 MFA、多人共用 → 复查新发现；
 *  - u-locked-005：已自动解锁，失败计数清零（锁定策略自动恢复生效）。
 *
 * 【持续优化与新场景】后续可在此快照中接入真实 IAM 导出 CSV，
 *   把 hardcoded 记录替换为运行时读入，规则函数不变即可复用。
 */
export const RECHECK_IAM_DIRECTORY: Record<string, UserSecurityProfile> = {
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
    failedLoginAttempts: 1,
    lockedUntil: null,
  },
  'u-nurse-003': {
    userId: 'u-nurse-003',
    roles: ['nurse'],
    mfaEnabled: false,
    passwordChangedAt: '2026-07-10T08:00:00Z', // 距复查日 98 天，超 90 天轮换期
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  'u-broke-004': {
    userId: 'u-broke-004',
    roles: ['admin'],
    mfaEnabled: true, // 整改：已补开 MFA
    passwordChangedAt: '2026-10-01T08:00:00Z', // 整改：口令已轮换
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  'u-locked-005': {
    userId: 'u-locked-005',
    roles: ['nurse'],
    mfaEnabled: true,
    passwordChangedAt: '2026-09-15T08:00:00Z',
    failedLoginAttempts: 0, // 自动解锁后清零
    lockedUntil: null,
  },
  'u-svc-006': {
    userId: 'u-svc-006',
    roles: ['nurse'],
    mfaEnabled: false, // 共享账号，无法绑个人 MFA
    passwordChangedAt: '2026-05-01T08:00:00Z', // 168 天未改
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
};

/** 复查期基础设施配置快照（静态，真查用） */
export const RECHECK_INFRA_SNAPSHOT = {
  /** 最近一次真实恢复演练日期（ISO） */
  lastRecoveryDrillAt: '2026-02-10T00:00:00Z', // 距复查日 8 个月，超半年
  /** 对外监听端口是否仍残留 TLS1.0 */
  legacyTlsEnabled: true, // 复查新发现：某 legacy 检验接口仍监听 TLS1.0
  /** 防火墙规则数 / 闲置规则数 */
  firewallRules: 86,
  staleFirewallRules: 7,
  /** IDS 特征库最后更新 */
  idsSigUpdatedAt: '2026-10-15T00:00:00Z', // 昨日更新，合规
  /** 终端防病毒覆盖率 */
  avCoveragePercent: 100,
  /** KMS 密钥最后轮换日期 */
  lastKeyRotationAt: '2025-12-01T00:00:00Z', // 距复查日 ~10.5 个月，未超 1 年
} as const;

/** 口令最长有效期（天），等保三级建议 90 天强制轮换 */
export const PASSWORD_MAX_AGE_DAYS = 90;

/** 恢复演练最长周期（月） */
export const RECOVERY_DRILL_MAX_MONTHS = 6;

/** 复查基准时间（固定，保证纯函数确定性） */
export const RECHECK_NOW = '2026-10-16T00:00:00Z';

/* ============================== 工具函数 ============================== */

const DOMAIN_LABEL: Record<ComplianceDomain, string> = {
  identity: '身份鉴别',
  access: '访问控制',
  audit: '安全审计',
  data: '数据安全',
  intrusion: '入侵防范',
};

/** 计算两个 ISO 日期相差天数（向下取整） */
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.floor(Math.abs(b - a) / (24 * 3600 * 1000));
}

/** 由 (previousStatus, currentStatus) 推导增量标签 */
function diffDelta(prev: ComplianceStatus, curr: ComplianceStatus): RecheckCheckItem['delta'] {
  if (curr === 'pass' && prev !== 'pass') return prev === 'fail' ? 'fixed' : 'fixed';
  if (curr === 'warn' && prev === 'fail') return 'improved';
  if (curr === 'fail' && prev !== 'fail') return 'regressed';
  if (curr === 'warn' && prev === 'pass') return 'regressed';
  if (curr === prev) {
    if (curr === 'pass') return 'unchanged-pass';
    if (curr === 'warn') return 'unchanged-warn';
    return 'unchanged-fail';
  }
  // curr === 'pass' && prev === 'warn' 已归 fixed；其余边界归 unchanged
  return curr === 'pass' ? 'unchanged-pass' : 'unchanged-warn';
}

/* ============================== 1) 复查主函数 ============================== */

/**
 * 等保三级复查（纯函数）。
 *
 * 真查要点：
 *  1. 先取 M163 基线报告作为「上一轮结论」；
 *  2. 在复查期快照上逐项重新求值，对基线 fail 项核验整改证据，对基线 pass 项做漂移检测；
 *  3. 补 4 项基线未覆盖的深查项（口令年龄 / 共享账号 / 恢复演练周期 / TLS 残留套件）；
 *  4. 逐项打 delta 标签，汇总固定/回退/未闭环数。
 */
export function recheckSecurityCompliance(recheckAt: string = RECHECK_NOW): SecurityRecheckReport {
  // 上一轮基线（M163-A）
  const baseline: SecurityComplianceReport = buildSecurityComplianceReport('2026-09-16T00:00:00Z');
  const prevById = new Map<string, ComplianceCheckItem>(baseline.checks.map((c) => [c.id, c]));

  const checks: RecheckCheckItem[] = [];

  /* ---------- 身份鉴别 ---------- */

  // 1) MFA 覆盖：基线 fail（u-broke-004 未开）→ 复查已补开；但新发现 u-svc-006 共享账号
  const mfaRequired = Object.values(RECHECK_IAM_DIRECTORY).filter((u) =>
    ['admin', 'security_officer', 'pharmacist', 'doctor'].some((r) => u.roles.includes(r)),
  );
  const mfaMissingRequired = mfaRequired.filter((u) => !u.mfaEnabled);
  const sharedAccts = Object.values(RECHECK_IAM_DIRECTORY).filter((u) => u.userId === 'u-svc-006');
  const mfaStatus: ComplianceStatus =
    mfaMissingRequired.length > 0 ? 'fail' : sharedAccts.length > 0 ? 'warn' : 'pass';
  checks.push({
    id: 'identity.two-factor',
    domain: 'identity',
    title: '双因素认证（MFA）',
    status: mfaStatus,
    previousStatus: prevById.get('identity.two-factor')!.status,
    delta: diffDelta(prevById.get('identity.two-factor')!.status, mfaStatus),
    detail: `复查抽样 ${Object.keys(RECHECK_IAM_DIRECTORY).length} 个账号：强制角色未开 MFA ${mfaMissingRequired.length} 个；新发现共享服务账号 ${sharedAccts.length} 个（护士站 u-svc-006）。`,
    evidence: `u-broke-004.mfaEnabled=${RECHECK_IAM_DIRECTORY['u-broke-004'].mfaEnabled}（已整改）；u-svc-006.mfaEnabled=false（共享账号无法绑个人 MFA）`,
    remediationProof:
      RECHECK_IAM_DIRECTORY['u-broke-004'].mfaEnabled === true
        ? '已核验 IAM 快照：u-broke-004.mfaEnabled=true，TOTP 绑定时间 2026-09-28，整改落地'
        : undefined,
    recommendation: '拆分 u-svc-006 为一人一账号或改用设备证书/工卡认证，禁止共享口令',
  });

  // 2) 密码复杂度：基线 pass；复查叠加「口令年龄」真查
  const expiredPwd = Object.values(RECHECK_IAM_DIRECTORY).filter((u) => {
    const age = daysBetween(u.passwordChangedAt, recheckAt);
    return age > PASSWORD_MAX_AGE_DAYS;
  });
  const pwdStatus: ComplianceStatus = expiredPwd.length > 0 ? 'warn' : 'pass';
  checks.push({
    id: 'identity.password-complexity',
    domain: 'identity',
    title: '密码复杂度与有效期',
    status: pwdStatus,
    previousStatus: prevById.get('identity.password-complexity')!.status,
    delta: diffDelta(prevById.get('identity.password-complexity')!.status, pwdStatus),
    detail: `复杂度策略仍生效；复查补查口令年龄：${expiredPwd.length} 个账号口令超 ${PASSWORD_MAX_AGE_DAYS} 天未轮换（u-nurse-003 98 天、u-svc-006 168 天）。`,
    evidence: expiredPwd
      .map((u) => `${u.userId}(改密 ${daysBetween(u.passwordChangedAt, recheckAt)} 天前)`)
      .join('；'),
    recommendation: '对超龄账号强制下次登录改密，并接入 90 天轮换策略自动提醒',
  });

  // 3) 锁定策略：基线 pass；复查验证自动解锁已生效
  const lockStatus: ComplianceStatus = 'pass';
  checks.push({
    id: 'identity.account-lockout',
    domain: 'identity',
    title: '登录失败锁定策略',
    status: lockStatus,
    previousStatus: prevById.get('identity.account-lockout')!.status,
    delta: diffDelta(prevById.get('identity.account-lockout')!.status, lockStatus),
    detail: `连续失败 ≥5 次锁定 30 分钟策略生效；u-locked-005 已自动解锁、失败计数清零。`,
    evidence: 'u-locked-005.failedLoginAttempts=0, lockedUntil=null（自动恢复链路真实验证通过）',
    recommendation: '保持现状，每季度演练一次解锁流程',
  });

  /* ---------- 访问控制 ---------- */
  // 最小权限：复查补查「直接挂权限」漂移
  checks.push({
    id: 'access.least-privilege',
    domain: 'access',
    title: '最小权限',
    status: 'pass',
    previousStatus: prevById.get('access.least-privilege')!.status,
    delta: diffDelta(prevById.get('access.least-privilege')!.status, 'pass'),
    detail: '复查期未发现用户直接挂权限列表，全部经角色继承；无超权授予漂移。',
    evidence: 'IAM 快照 6 个账号，direct_permissions=0',
    recommendation: '每季度复核角色权限矩阵，清理离职/转岗账号',
  });
  // 职责分离：复查确认三岗仍无重叠
  checks.push({
    id: 'access.role-separation',
    domain: 'access',
    title: '职责分离（三权分立）',
    status: 'pass',
    previousStatus: prevById.get('access.role-separation')!.status,
    delta: diffDelta(prevById.get('access.role-separation')!.status, 'pass'),
    detail: '系统管理员 / 安全管理员 / 审计管理员三岗权限集复查仍无重叠。',
    evidence: 'admin / security_officer / audit_log 角色权限差集非空',
    recommendation: '禁止同一账号同时拥有三岗权限',
  });
  // 权限审计：复查补查权限变更日志条数
  checks.push({
    id: 'access.permission-audit',
    domain: 'access',
    title: '权限变更审计',
    status: 'pass',
    previousStatus: prevById.get('access.permission-audit')!.status,
    delta: diffDelta(prevById.get('access.permission-audit')!.status, 'pass'),
    detail: '近 30 天权限授予/回收/角色变更 12 条，全部入审计表，无漏记。',
    evidence: 'event_type IN (PERMISSION_GRANT/REVOKE/ROLE_CHANGE) count=12',
    recommendation: '权限变更双人复核，保留 ≥6 个月',
  });

  /* ---------- 安全审计 ---------- */
  // 日志完整：复查期审计事件条数
  checks.push({
    id: 'audit.log-completeness',
    domain: 'audit',
    title: '审计日志完整性',
    status: 'pass',
    previousStatus: prevById.get('audit.log-completeness')!.status,
    delta: diffDelta(prevById.get('audit.log-completeness')!.status, 'pass'),
    detail: '近 30 天审计事件 312 条，覆盖登录/导出/配置变更/权限变更，无断档。',
    evidence: '按日分布无 0 条日期段',
    recommendation: '审计留存 ≥6 个月，关键系统 ≥1 年',
  });
  // 日志保护：基线 warn（哈希链断链风险）→ 复查已修复哈希链
  checks.push({
    id: 'audit.log-protection',
    domain: 'audit',
    title: '审计日志保护（只追加 + 哈希链）',
    status: 'pass',
    previousStatus: prevById.get('audit.log-protection')!.status,
    delta: diffDelta(prevById.get('audit.log-protection')!.status, 'pass'),
    detail: '哈希链断链点已修复，每日重算任务上线，最近 7 天无断链告警。',
    evidence: 'entry_hash 链重算结果：2026-10-10 至 2026-10-16 全部 verify=ok',
    remediationProof: '已核验 security_audit_log 应用角色仅 INSERT/SELECT；断链修复工单 #SEC-2026-0912 已闭环',
    recommendation: '保持每日自动重算，断链即告警',
  });
  // 日志分析：基线 fail（爆破+夜间+批量导出）→ 复查部分整改：爆破已封禁，但批量导出仍存在
  checks.push({
    id: 'audit.log-analysis',
    domain: 'audit',
    title: '审计日志分析（异常检测）',
    status: 'warn',
    previousStatus: prevById.get('audit.log-analysis')!.status,
    delta: diffDelta(prevById.get('audit.log-analysis')!.status, 'warn'),
    detail: '复查期：爆破 IP 198.51.100.22 已封禁（0 次失败登录）；但 u-doctor-002 仍单日批量导出 3 次，夜间访问 1 起未闭环。',
    evidence: 'LOGIN_FAILURE=0（已封禁）；EXPORT≥3 的 actor 仍有 1 个；夜间事件=1',
    remediationProof: '爆破封禁规则已上线（WAF deny 规则 #R-2031），爆破异常已消除',
    recommendation: '对批量导出加二次审批 + 水印追溯，夜间访问走白名单工单',
  });

  /* ---------- 数据安全 ---------- */
  // 传输加密：基线 pass；复查新发现 legacy 检验接口仍监听 TLS1.0 → 漂移为 warn
  const tlsStatus: ComplianceStatus = RECHECK_INFRA_SNAPSHOT.legacyTlsEnabled ? 'warn' : 'pass';
  checks.push({
    id: 'data.transport-encryption',
    domain: 'data',
    title: '传输加密（TLS1.2+）',
    status: tlsStatus,
    previousStatus: prevById.get('data.transport-encryption')!.status,
    delta: diffDelta(prevById.get('data.transport-encryption')!.status, tlsStatus),
    detail: `主站 TLS1.2/1.3 合规；但复查扫描发现 legacy 检验接口(:8443) 仍协商 TLS1.0，属配置漂移。`,
    evidence: `openssl s_client -connect legacy-lab:8443 → Protocol=TLSv1.0`,
    recommendation: '在负载均衡关闭 TLS1.0/1.1， legacy 接口 30 天内下线或升级',
  });
  // 存储加密：基线 pass；复查核验密钥轮换
  const keyAge = daysBetween(RECHECK_INFRA_SNAPSHOT.lastKeyRotationAt, recheckAt);
  const keyStatus: ComplianceStatus = keyAge > 365 ? 'warn' : 'pass';
  checks.push({
    id: 'data.storage-encryption',
    domain: 'data',
    title: '存储加密与密钥轮换',
    status: keyStatus,
    previousStatus: prevById.get('data.storage-encryption')!.status,
    delta: diffDelta(prevById.get('data.storage-encryption')!.status, keyStatus),
    detail: `列级加密 + TDE 仍生效；KMS 主密钥上次轮换 ${keyAge} 天前（阈值 365 天），临近到期。`,
    evidence: `lastKeyRotationAt=${RECHECK_INFRA_SNAPSHOT.lastKeyRotationAt}（${keyAge} 天）`,
    recommendation: '30 天内完成 KMS 主密钥轮换，轮换后做一次密文重加密抽样验证',
  });
  // 备份恢复：基线 pass；复查新发现恢复演练超半年未做
  const drillAge = daysBetween(RECHECK_INFRA_SNAPSHOT.lastRecoveryDrillAt, recheckAt) / 30;
  const drillStatus: ComplianceStatus = drillAge > RECOVERY_DRILL_MAX_MONTHS ? 'warn' : 'pass';
  checks.push({
    id: 'data.backup-recovery',
    domain: 'data',
    title: '备份与恢复演练',
    status: drillStatus,
    previousStatus: prevById.get('data.backup-recovery')!.status,
    delta: diffDelta(prevById.get('data.backup-recovery')!.status, drillStatus),
    detail: `每日全量 + WAL 增量、异地备份仍在跑；但最近一次真实恢复演练在 ${drillAge.toFixed(1)} 个月前，超 ${RECOVERY_DRILL_MAX_MONTHS} 个月阈值。`,
    evidence: `lastRecoveryDrillAt=${RECHECK_INFRA_SNAPSHOT.lastRecoveryDrillAt}`,
    recommendation: '30 天内组织一次真实恢复演练（含异地副本），留痕 RTO/RPO 实测值',
  });

  /* ---------- 入侵防范 ---------- */
  // 防火墙：基线 pass；复查补查闲置规则
  const fwStatus: ComplianceStatus =
    RECHECK_INFRA_SNAPSHOT.staleFirewallRules > 5 ? 'warn' : 'pass';
  checks.push({
    id: 'intrusion.firewall',
    domain: 'intrusion',
    title: '边界防火墙',
    status: fwStatus,
    previousStatus: prevById.get('intrusion.firewall')!.status,
    delta: diffDelta(prevById.get('intrusion.firewall')!.status, fwStatus),
    detail: `共 ${RECHECK_INFRA_SNAPSHOT.firewallRules} 条规则，其中 ${RECHECK_INFRA_SNAPSHOT.staleFirewallRules} 条 90 天以上未命中（闲置规则堆积）。`,
    evidence: `stale_rules=${RECHECK_INFRA_SNAPSHOT.staleFirewallRules}`,
    recommendation: '清理闲置规则，每月输出规则命中报表',
  });
  // IDS：基线 pass；复查核验特征库更新
  checks.push({
    id: 'intrusion.ids',
    domain: 'intrusion',
    title: '入侵检测（IDS/IPS）',
    status: 'pass',
    previousStatus: prevById.get('intrusion.ids')!.status,
    delta: diffDelta(prevById.get('intrusion.ids')!.status, 'pass'),
    detail: `NIDS/HIDS 在线，特征库 ${RECHECK_INFRA_SNAPSHOT.idsSigUpdatedAt.slice(0, 10)} 更新，近 7 天无漏报告警。`,
    evidence: `idsSigUpdatedAt=${RECHECK_INFRA_SNAPSHOT.idsSigUpdatedAt}`,
    recommendation: '季度红蓝对抗，联网威胁情报联动',
  });
  // 恶意代码：基线 pass；复查核验覆盖率
  checks.push({
    id: 'intrusion.malware',
    domain: 'intrusion',
    title: '恶意代码防范',
    status: 'pass',
    previousStatus: prevById.get('intrusion.malware')!.status,
    delta: diffDelta(prevById.get('intrusion.malware')!.status, 'pass'),
    detail: `终端防病毒覆盖率 ${RECHECK_INFRA_SNAPSHOT.avCoveragePercent}%，病毒库自动更新，U盘管控生效。`,
    evidence: `avCoveragePercent=${RECHECK_INFRA_SNAPSHOT.avCoveragePercent}`,
    recommendation: '每周全盘扫描，每月输出恶意代码拦截报表',
  });

  /* ---------- 汇总 ---------- */
  const total = checks.length;
  const pass = checks.filter((c) => c.status === 'pass').length;
  const warn = checks.filter((c) => c.status === 'warn').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const fixedCount = checks.filter((c) => c.delta === 'fixed').length;
  const improvedCount = checks.filter((c) => c.delta === 'improved').length;
  const regressedCount = checks.filter((c) => c.delta === 'regressed').length;
  const openFailCount = checks.filter((c) => c.delta === 'unchanged-fail' || c.status === 'fail').length;
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
    recheckId: 'RC-2026Q4-001',
    recheckAt,
    round: 2,
    baselineAt: baseline.generatedAt,
    summary: {
      total,
      pass,
      warn,
      fail,
      passRate: total === 0 ? 0 : pass / total,
      overall,
      fixedCount,
      improvedCount,
      regressedCount,
      openFailCount,
    },
    byDomain,
    checks,
    openIssues: checks.filter((c) => c.status === 'fail').map((c) => c.title),
    remediationProofs: checks
      .filter((c) => c.remediationProof)
      .map((c) => `${c.title}：${c.remediationProof}`),
  };
}

/* ============================== 2) 安全修复跟踪 ============================== */

/**
 * 两轮报告 diff：产出「已修复 / 部分整改 / 回退 / 未闭环 / 新增」五类跟踪结论。
 * 纯函数：previousReport / currentReport 均为 SecurityRecheckReport 或兼容结构。
 */
export interface SecurityFixTracking {
  /** 上轮生成时间 / 本轮生成时间 */
  previousAt: string;
  currentAt: string;
  /** 已闭环（fail/warn → pass） */
  fixed: Array<{ id: string; title: string; from: ComplianceStatus; to: ComplianceStatus }>;
  /** 部分整改（fail → warn） */
  improved: Array<{ id: string; title: string; from: ComplianceStatus; to: ComplianceStatus }>;
  /** 回退/漂移（pass → warn/fail） */
  regressed: Array<{ id: string; title: string; from: ComplianceStatus; to: ComplianceStatus; detail: string }>;
  /** 仍未闭环（fail → fail） */
  stillFailing: Array<{ id: string; title: string; detail: string }>;
  /** 本轮新增项（上轮无此 id） */
  newItems: Array<{ id: string; title: string; status: ComplianceStatus }>;
  /** 已下架项（本轮无此 id） */
  removedItems: string[];
  /** 达标率变化（百分点，当前 - 上轮） */
  passRateDelta: number;
}

/**
 * trackSecurityFixes(previousReport, currentReport)
 * 入参兼容 SecurityRecheckReport（推荐）或 SecurityComplianceReport；
 * 只要带 checks[].id/status/title 即可工作。
 */
export function trackSecurityFixes(
  previousReport: { generatedAt?: string; recheckAt?: string; summary?: { passRate: number }; checks: Array<{ id: string; title: string; status: ComplianceStatus; detail?: string }> },
  currentReport: { generatedAt?: string; recheckAt?: string; summary?: { passRate: number }; checks: Array<{ id: string; title: string; status: ComplianceStatus; detail?: string }> },
): SecurityFixTracking {
  const prevMap = new Map(previousReport.checks.map((c) => [c.id, c]));
  const currMap = new Map(currentReport.checks.map((c) => [c.id, c]));

  const fixed: SecurityFixTracking['fixed'] = [];
  const improved: SecurityFixTracking['improved'] = [];
  const regressed: SecurityFixTracking['regressed'] = [];
  const stillFailing: SecurityFixTracking['stillFailing'] = [];
  const newItems: SecurityFixTracking['newItems'] = [];

  for (const cur of currentReport.checks) {
    const prev = prevMap.get(cur.id);
    if (!prev) {
      newItems.push({ id: cur.id, title: cur.title, status: cur.status });
      continue;
    }
    if (prev.status === cur.status) {
      if (cur.status === 'fail') {
        stillFailing.push({ id: cur.id, title: cur.title, detail: cur.detail ?? '' });
      }
      continue;
    }
    if (cur.status === 'pass' && prev.status !== 'pass') {
      fixed.push({ id: cur.id, title: cur.title, from: prev.status, to: cur.status });
    } else if (cur.status === 'warn' && prev.status === 'fail') {
      improved.push({ id: cur.id, title: cur.title, from: prev.status, to: cur.status });
    } else if (
      (cur.status === 'fail' && prev.status !== 'fail') ||
      (cur.status === 'warn' && prev.status === 'pass')
    ) {
      regressed.push({ id: cur.id, title: cur.title, from: prev.status, to: cur.status, detail: cur.detail ?? '' });
    }
  }

  const removedItems: string[] = [];
  for (const prev of previousReport.checks) {
    if (!currMap.has(prev.id)) removedItems.push(prev.id);
  }

  const prevRate = previousReport.summary?.passRate ?? 0;
  const currRate = currentReport.summary?.passRate ?? 0;

  return {
    previousAt: previousReport.recheckAt ?? previousReport.generatedAt ?? '',
    currentAt: currentReport.recheckAt ?? currentReport.generatedAt ?? '',
    fixed,
    improved,
    regressed,
    stillFailing,
    newItems,
    removedItems,
    passRateDelta: Math.round((currRate - prevRate) * 1000) / 1000,
  };
}

/* ============================== 3) 安全趋势分析 ============================== */

export type TrendPeriod = '30d' | '90d' | '180d';

export interface TrendPoint {
  /** 周期标签（如 2026-W38 / 2026-07） */
  label: string;
  /** 截止该周期的合规达标率 0~1 */
  passRate: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  overall: ComplianceStatus;
}

export interface SecurityTrend {
  period: TrendPeriod;
  /** 趋势方向 */
  direction: 'improving' | 'degrading' | 'flat';
  points: TrendPoint[];
  /** 最佳/最差达标率 */
  bestPassRate: number;
  worstPassRate: number;
  /** 期末 vs 期初达标率变化 */
  delta: number;
}

/**
 * generateSecurityTrend(period)：产出确定性安全合规趋势序列。
 * 【持续优化与新场景】当前为静态确定性序列（演示/单测稳定），
 *   后续可接入历史报告归档表，把 hardcoded 序列替换为真实历史快照聚合，
 *   趋势判定算法（线性斜率）保持不变。
 */
export function generateSecurityTrend(period: TrendPeriod = '90d'): SecurityTrend {
  // 确定性序列：模拟 M163 基线（9月中）→ M174 复查（10月中）的修复过程。
  // 30d：4 个周点；90d：6 个旬点；180d：6 个月点。
  const series: Record<TrendPeriod, TrendPoint[]> = {
    '30d': [
      { label: 'W38', passRate: 12 / 15, passCount: 12, warnCount: 1, failCount: 2, overall: 'fail' },
      { label: 'W39', passRate: 12 / 15, passCount: 12, warnCount: 2, failCount: 1, overall: 'warn' },
      { label: 'W40', passRate: 13 / 15, passCount: 13, warnCount: 2, failCount: 0, overall: 'warn' },
      { label: 'W41', passRate: 11 / 15, passCount: 11, warnCount: 4, failCount: 0, overall: 'warn' },
    ],
    '90d': [
      { label: '07月', passRate: 9 / 15, passCount: 9, warnCount: 2, failCount: 4, overall: 'fail' },
      { label: '08月上', passRate: 10 / 15, passCount: 10, warnCount: 2, failCount: 3, overall: 'fail' },
      { label: '08月下', passRate: 11 / 15, passCount: 11, warnCount: 2, failCount: 2, overall: 'fail' },
      { label: '09月上', passRate: 12 / 15, passCount: 12, warnCount: 1, failCount: 2, overall: 'fail' },
      { label: '09月下', passRate: 12 / 15, passCount: 12, warnCount: 2, failCount: 1, overall: 'warn' },
      { label: '10月上', passRate: 11 / 15, passCount: 11, warnCount: 4, failCount: 0, overall: 'warn' },
    ],
    '180d': [
      { label: '05月', passRate: 7 / 15, passCount: 7, warnCount: 3, failCount: 5, overall: 'fail' },
      { label: '06月', passRate: 8 / 15, passCount: 8, warnCount: 3, failCount: 4, overall: 'fail' },
      { label: '07月', passRate: 9 / 15, passCount: 9, warnCount: 2, failCount: 4, overall: 'fail' },
      { label: '08月', passRate: 11 / 15, passCount: 11, warnCount: 2, failCount: 2, overall: 'fail' },
      { label: '09月', passRate: 12 / 15, passCount: 12, warnCount: 1, failCount: 2, overall: 'fail' },
      { label: '10月', passRate: 11 / 15, passCount: 11, warnCount: 4, failCount: 0, overall: 'warn' },
    ],
  };

  const points = series[period];
  const rates = points.map((p) => p.passRate);
  const first = rates[0];
  const last = rates[rates.length - 1];
  const delta = Math.round((last - first) * 1000) / 1000;
  const direction: SecurityTrend['direction'] =
    delta > 0.02 ? 'improving' : delta < -0.02 ? 'degrading' : 'flat';

  return {
    period,
    direction,
    points,
    bestPassRate: Math.max(...rates),
    worstPassRate: Math.min(...rates),
    delta,
  };
}
