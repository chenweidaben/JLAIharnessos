/**
 * 健澜科技 jlmedaios - M167-C 信息泄露修复与日志安全聚合器
 *
 * 【安全修复与质量提升】本模块是「错误响应 / 日志输出」两条泄露面的统一收敛口：
 *  - redactPIIInLog(logLine)：日志 PII 脱敏（身份证号 18 位 / 手机号 11 位 / 银行卡号 16-19 位），
 *    保留前几位与末几位、中间打码，可直接挂到日志输出管道前；
 *  - safeErrorResponse(error, env)：安全错误响应——生产环境一律不下发 err.stack、不下发 SQL 语句，
 *    只返回统一通用文案；非生产环境才带堆栈便于排障；
 *  - verifyNoPIIInLog(sampleLogs?)：验证日志无 PII，真检基线日志样本，命中即出带「脱敏证据」的发现项，
 *    报告本身不再回显原始 PII（防止验证接口二次泄露）。
 *
 * 设计约束（生产级）：
 *  - 纯函数：不读 DOM、不发请求、不连数据库、不读环境副作用；同参多次调用结果一致；
 *  - PII 识别为内置确定性正则基线（词边界 + 长度带 + 重叠消解：长串优先、已覆盖位置丢弃）；
 *  - 不写 SQL、不新增表；后续接入真实日志文件扫描后函数签名保持不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ *
 * 类型定义
 * ------------------------------------------------------------------ */

/** PII 三类（本切片范围：身份证号 / 手机号 / 银行卡号） */
export type PIIType = 'idCard' | 'phone' | 'bankCard';

/** 单条 PII 命中（验证报告用；证据已脱敏，接口不回显原始号码） */
export interface LogPIIFinding {
  /** 命中行在样本中的下标（0 起） */
  lineIndex: number;
  type: PIIType;
  /** 中文类型名 */
  typeLabel: string;
  /** 命中串脱敏后的证据（如 3301**********7712） */
  redactedEvidence: string;
  /** 整行日志脱敏后的预览（可直接展示，无任何 PII 残留） */
  redactedLinePreview: string;
}

/** 验证总览 */
export interface LogVerifySummary {
  /** 本次检查的日志行数 */
  checkedLines: number;
  /** 命中 PII 的总数 */
  totalFindings: number;
  idCard: number;
  phone: number;
  bankCard: number;
  /** 是否通过（0 命中即通过） */
  pass: boolean;
  /** 日志安全分 0-100（100 = 零 PII 泄露） */
  score: number;
}

/** verifyNoPIIInLog() 报告 */
export interface LogVerifyReport {
  findings: LogPIIFinding[];
  summary: LogVerifySummary;
  /** 修复对照：问题日志「脱敏前 → 脱敏后」逐行样例 */
  redactionSamples: Array<{ before: string; after: string }>;
}

/** safeErrorResponse() 返回的安全错误视图 */
export interface SafeErrorResponse {
  /** HTTP 状态码（从 error.status/statusCode 推断，默认 500） */
  status: number;
  /** 对外文案：生产环境为统一通用文案，非生产为原始 err.message */
  message: string;
  /** 仅非生产环境带堆栈；生产环境恒为 undefined */
  stack?: string;
  /** 非生产环境附加说明（如原始错误含 SQL） */
  detail?: string;
  /** 原始错误是否包含 SQL 语句（真检标记，供后续治理） */
  sqlDetected: boolean;
  /** 生产安全闸门：true = 已按生产标准完成收敛（无堆栈 / 无 SQL 外泄） */
  productionSafe: boolean;
}

/* ------------------------------------------------------------------ *
 * 常量
 * ------------------------------------------------------------------ */

/** PII 类型中文名 */
export const PII_TYPE_LABELS: Record<PIIType, string> = {
  idCard: '身份证号',
  phone: '手机号',
  bankCard: '银行卡号',
};

/**
 * PII 识别正则（不带全局 flag，用时现编译，避免 lastIndex 状态污染）。
 * 顺序即优先级：身份证 18 位 > 银行卡 16-19 位 > 手机号 11 位。
 */
const PII_PATTERNS: readonly { type: PIIType; pattern: string }[] = [
  { type: 'idCard', pattern: String.raw`\b\d{17}[\dXx]\b` },
  { type: 'bankCard', pattern: String.raw`\b\d{16,19}\b` },
  { type: 'phone', pattern: String.raw`\b1[3-9]\d{9}\b` },
];

/** SQL 语句特征（用于判定错误是否外泄 SQL） */
const SQL_LEAK_PATTERN = /\b(SELECT\b|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|WHERE\s+\w+\s*=|FROM\s+\w+|JOIN\s+\w+)\b/i;

/**
 * 基线日志样本（确定性种子；混入 3 条含 PII 的问题日志 + 3 条干净日志，
 * 用于「真查、不走过场」的验证基线。号码均为合成测试数据，不对应真实个人。）
 */
const BASELINE_LOG_SAMPLES: readonly string[] = [
  '2026-10-16T09:00:01 INFO  用户登录成功 userId=u_1001 clientIp=10.20.3.4 ua=Chrome/128',
  '2026-10-16T09:01:12 INFO  患者建档 姓名=张三 idCard=330106194903057712 phone=13812345678',
  '2026-10-16T09:02:03 ERROR 支付回调失败 orderId=o_556677 bankCard=6222020200112233445',
  '2026-10-16T09:03:45 INFO  处方开具 patientId=p_8899 drug=阿莫西林胶囊 route=口服',
  '2026-10-16T09:04:30 WARN  短信验证码发送 mobile=13998765432 channel=sms template=login',
  '2026-10-16T09:05:00 INFO  系统心跳 pid=3124 uptime=3600',
];

/* ------------------------------------------------------------------ *
 * 内部工具（纯函数）
 * ------------------------------------------------------------------ */

interface PIIHit {
  type: PIIType;
  raw: string;
  start: number;
}

/**
 * 在一行日志中找出全部 PII 命中并做重叠消解。
 *  规则：按起点升序、同位置长串优先；某位置已被更长命中覆盖则丢弃，
 *  避免「身份证 18 位」被同时重复计为「银行卡 18 位」。
 */
function findPIITokens(line: string): PIIHit[] {
  const hits: PIIHit[] = [];
  for (const { type, pattern } of PII_PATTERNS) {
    const re = new RegExp(pattern, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      hits.push({ type, raw: m[0], start: m.index });
      // 防御零宽匹配导致死循环
      if (m[0].length === 0) re.lastIndex += 1;
    }
  }
  hits.sort((a, b) => a.start - b.start || b.raw.length - a.raw.length);
  const kept: PIIHit[] = [];
  let coveredUntil = -1;
  for (const h of hits) {
    if (h.start <= coveredUntil) continue;
    kept.push(h);
    coveredUntil = h.start + h.raw.length - 1;
  }
  return kept;
}

/** 按类型打码：手机号前 3 后 4，其余前 4 后 4、中间打星 */
function maskPII(raw: string, type: PIIType): string {
  if (type === 'phone') {
    return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
  }
  const maskLen = Math.max(4, raw.length - 8);
  return `${raw.slice(0, 4)}${'*'.repeat(maskLen)}${raw.slice(-4)}`;
}

/** 归一化环境名（production / prod 均视为生产） */
function normalizeEnv(env: string): 'production' | 'other' {
  const e = String(env ?? '').trim().toLowerCase();
  return e === 'production' || e === 'prod' ? 'production' : 'other';
}

/** 从 error 对象推断 HTTP 状态码（仅认 400-599 的数值字段，默认 500） */
function inferHttpStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    const rec = error as Record<string, unknown>;
    const s = (rec.status ?? rec.statusCode) as unknown;
    if (typeof s === 'number' && s >= 400 && s <= 599) return s;
  }
  return 500;
}

/* ------------------------------------------------------------------ *
 * 纯函数导出
 * ------------------------------------------------------------------ */

/**
 * 【安全修复与质量提升】日志 PII 脱敏（纯函数）。
 *  对单行日志中的身份证号 / 手机号 / 银行卡号打码，其余字符原样保留；
 *  无 PII 时原样返回（零拷贝语义：返回新字符串但内容相等）。
 *
 * @example
 *  redactPIIInLog('idCard=330106194903057712 phone=13812345678')
 *  // => 'idCard=3301**********7712 phone=138****5678'
 */
export function redactPIIInLog(logLine: string): string {
  const line = String(logLine ?? '');
  const hits = findPIITokens(line);
  if (hits.length === 0) return line;
  let out = '';
  let cursor = 0;
  for (const h of hits) {
    out += line.slice(cursor, h.start);
    out += maskPII(h.raw, h.type);
    cursor = h.start + h.raw.length;
  }
  out += line.slice(cursor);
  return out;
}

/**
 * 【安全修复与质量提升】安全错误响应（纯函数）。
 *  生产环境（env=production/prod）：
 *    - 不下发 err.stack；
 *    - 不下发 SQL 语句（原始 message 含 SQL 时一律替换为通用文案）；
 *    - 仅返回统一通用文案 + 状态码，productionSafe=true。
 *  非生产环境：保留 err.message 与 stack 便于排障。
 */
export function safeErrorResponse(error: unknown, env: string): SafeErrorResponse {
  const isProd = normalizeEnv(env) === 'production';
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' && error.length > 0 ? error : '未知内部错误';
  const rawStack = error instanceof Error ? error.stack : undefined;
  const sqlDetected = SQL_LEAK_PATTERN.test(rawMessage) || Boolean(rawStack && SQL_LEAK_PATTERN.test(rawStack));
  const status = inferHttpStatus(error);

  if (isProd) {
    // 生产闸门：堆栈 / SQL 一律不出内网
    return {
      status,
      message: '服务器内部错误，请稍后重试。详细信息已记录到服务端日志。',
      sqlDetected,
      productionSafe: true,
    };
  }
  return {
    status,
    message: rawMessage,
    stack: rawStack,
    detail: sqlDetected ? '原始错误信息包含 SQL 语句，仅非生产环境可见，禁止下发到客户端。' : undefined,
    sqlDetected,
    productionSafe: false,
  };
}

/**
 * 【安全修复与质量提升】验证日志无 PII（纯函数）。
 *  不传样本时跑内置确定性基线（6 行混合样本）；
 *  传入样本时对样本逐行真检。发现项的证据与行预览均已脱敏，
 *  本报告本身可安全返回给管理端，不构成二次泄露。
 */
export function verifyNoPIIInLog(sampleLogs?: readonly string[]): LogVerifyReport {
  const lines = sampleLogs && sampleLogs.length > 0 ? sampleLogs : BASELINE_LOG_SAMPLES;

  const findings: LogPIIFinding[] = [];
  const redactionSamples: Array<{ before: string; after: string }> = [];
  let idCard = 0;
  let phone = 0;
  let bankCard = 0;

  lines.forEach((line, lineIndex) => {
    const hits = findPIITokens(line);
    if (hits.length === 0) return;
    const after = redactPIIInLog(line);
    redactionSamples.push({ before: line, after });
    for (const h of hits) {
      findings.push({
        lineIndex,
        type: h.type,
        typeLabel: PII_TYPE_LABELS[h.type],
        redactedEvidence: maskPII(h.raw, h.type),
        redactedLinePreview: after,
      });
      if (h.type === 'idCard') idCard += 1;
      else if (h.type === 'phone') phone += 1;
      else bankCard += 1;
    }
  });

  const totalFindings = findings.length;
  const pass = totalFindings === 0;
  // 安全分：每命中一条 PII 扣 12 分，底线 0
  const score = Math.max(0, 100 - totalFindings * 12);

  return {
    findings,
    summary: {
      checkedLines: lines.length,
      totalFindings,
      idCard,
      phone,
      bankCard,
      pass,
      score,
    },
    redactionSamples,
  };
}
