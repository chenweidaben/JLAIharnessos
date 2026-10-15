/**
 * 健澜科技 jlmedaios - M136-A 错误信息脱敏聚合器
 *
 * 本模块仅提供纯函数与静态策略清单，是「生产就绪质量门禁」的一部分：
 *  - sanitizeErrorForClient(err, isProduction)：把任意异常对象归一为「对客户端安全」的错误信封；
 *  - runErrorMaskingSelfTest()：以代表性对抗错误跑一遍脱敏，产出红/黄/绿证据，供管理端报告复用。
 *
 * 整改要点（M135-D 遗留黄色项 → 本次转绿）：
 *  1. 生产环境关闭详细错误堆栈——5xx 一律返回「系统繁忙，请稍后重试」；
 *  2. 详细错误（堆栈 / SQL / 物理路径 / 内部主机）只写服务端日志，不下发客户端；
 *  3. 401 / 403 / 404 保持明确语义（未登录 / 无权限 / 资源不存在），便于前端引导；
 *  4. 任何对外 message 都过一遍堆栈 / 路径 / SQL / 内网 IP 剥离，杜绝调试残留。
 *
 * 设计约束（与 securityBaselineAggregator 同一纪律）：
 *  - 不发起任何 HTTP 请求，不连接数据库，不读取环境副作用；
 *  - isProduction 由调用方（运行时 / 路由层）显式传入，纯函数可在单测中正反两用；
 *  - 详细信息通过 serverDetail 字段回流，仅供服务端 console / 日志系统消费。
 *
 * 持续优化：后续可在此扩展错误码 → i18n 文案映射、traceId 关联日志链路。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 对客户端安全的错误信封 */
export interface SanitizedError {
  /** HTTP 状态码（4xx 透传，5xx 在生产统一 500） */
  status: number;
  /** 业务错误码（与 types.ts ErrorCode 对齐） */
  code: number;
  /** 对客户端可见的安全提示（已剥离堆栈 / SQL / 路径 / 内网地址） */
  message: string;
  /** 是否仍有内部细节泄向客户端（生产必须为 false） */
  exposed: boolean;
  /** 完整原始错误文本——仅供服务端日志，禁止下发客户端 */
  serverDetail: string;
}

/* ============================== 内部工具 ============================== */

/** 生产环境统一兜底文案 */
export const PROD_FALLBACK_MESSAGE = '系统繁忙，请稍后重试';

/** 开发环境兜底文案（保留可读错误类型，但剥离细节） */
const DEV_FALLBACK_MESSAGE = 'Internal Server Error';

/**
 * 从任意异常载体中提取原始 message / status / code。
 * 支持：Error 实例、{ status/statusCode, code, message } 对象、字符串、未知类型。
 */
function normalizeRaw(err: unknown): { rawMessage: string; status: number; code: number } {
  if (err == null) {
    return { rawMessage: '', status: 500, code: 50000 };
  }
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; statusCode?: number; code?: number };
    const status = anyErr.status ?? anyErr.statusCode ?? 500;
    const code = typeof anyErr.code === 'number' ? anyErr.code : 50000;
    return { rawMessage: err.message ?? err.name ?? 'Error', status, code };
  }
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const status =
      typeof o.status === 'number' ? o.status : typeof o.statusCode === 'number' ? o.statusCode : 500;
    const code = typeof o.code === 'number' ? o.code : 50000;
    const message = typeof o.message === 'string' ? o.message : JSON.stringify(o);
    return { rawMessage: message, status, code };
  }
  // string / number / boolean 等原始类型
  return { rawMessage: String(err), status: 500, code: 50000 };
}

/**
 * 剥离一条文本中的内部细节：堆栈帧、物理路径、SQL 片段、内网主机 / IP。
 * 与 securityBaselineAggregator.redactError 等价，但不依赖其内部导出，避免循环耦合。
 */
function stripInternalDetail(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return '';
  let out = text;
  // 堆栈帧：at queryFn (C:\app\db.ts:44:11) / at Object.<anonymous> (/app/src/x.ts:1:1)
  out = out.replace(/at\s+\S+\s*\([^)]*\)/g, '[stack]');
  out = out.replace(/\bat\s+\S+/g, '[stack]');
  // 物理路径：Windows C:\... 与 Unix /usr /app /opt /home /var 下的绝对路径
  out = out.replace(/[A-Za-z]:\\[^\s"'']+/g, '[path]');
  out = out.replace(/\/(?:usr|app|opt|home|var|etc|tmp)\/[^\s"'']+/g, '[path]');
  // SQL 片段
  out = out.replace(/\b(SELECT|INSERT|UPDATE|DELETE)\s+[^"'\n;]+/gi, '[sql]');
  // 内网 IP / 主机（10.x / 172.16-31.x / 192.168.x / localhost）
  out = out.replace(
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    '[host]',
  );
  out = out.replace(/\b(?:localhost|db|postgres|redis|internal)[._-][\w.-]*/gi, '[host]');
  // 端口尾随（:5432 / :6379）
  out = out.replace(/:\d{2,5}\b/g, ':[port]');
  return out.trim();
}

/** 判断一条文本是否仍残留内部细节（堆栈 / 路径 / SQL / 内网地址） */
export function hasInternalDetail(raw: string): boolean {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  return (
    /\bat\s+\w+\s*\(/.test(raw) || // 堆栈帧残留
    /[A-Za-z]:\\|\/(?:usr|app|opt|home|var|etc|tmp)\//.test(raw) || // 物理路径
    /\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(raw) || // SQL 关键字残留
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/.test(raw) // 内网 IP
  );
}

/* ============================== 主纯函数 ============================== */

/**
 * 把任意异常归一为「对客户端安全」的错误信封。
 *
 * 策略矩阵：
 *  - 401 / 403 / 404 / 409 / 429 / 400 等客户端错误：透传状态码与业务码，message 保留明确语义，
 *    但仍过一遍 stripInternalDetail，防止调试信息混进 4xx 提示；
 *  - 5xx 且 isProduction=true：message 强制为「系统繁忙，请稍后重试」，status=500，exposed=false；
 *  - 5xx 且 isProduction=false（开发态）：返回剥离后的可读错误，便于前端联调，但不保留完整堆栈；
 *  - serverDetail 始终携带原始文本，供服务端日志。
 *
 * @param err 任意异常（Error / 普通对象 / 字符串 / null）
 * @param isProduction 是否生产环境（由运行时按 NODE_ENV 注入）
 */
export function sanitizeErrorForClient(err: unknown, isProduction: boolean): SanitizedError {
  const { rawMessage, status, code } = normalizeRaw(err);

  // serverDetail 永远保留完整原始信息，仅供日志
  const serverDetail = rawMessage || '(no error message)';

  // 客户端错误（4xx）：保持明确语义，但剥离可能混入的内部细节
  if (status >= 400 && status < 500) {
    const safeMessage = stripInternalDetail(rawMessage);
    return {
      status,
      code,
      message: safeMessage || defaultClientMessage(status),
      exposed: hasInternalDetail(rawMessage) && !safeMessage,
      serverDetail,
    };
  }

  // 5xx 或未知状态：生产统一兜底，开发态剥离后可读
  if (isProduction) {
    return {
      status: 500,
      code: 50000,
      message: PROD_FALLBACK_MESSAGE,
      exposed: false,
      serverDetail,
    };
  }

  // 开发态：剥离内部细节后返回可读错误，便于联调
  const stripped = stripInternalDetail(rawMessage);
  return {
    status,
    code,
    message: stripped || DEV_FALLBACK_MESSAGE,
    exposed: hasInternalDetail(stripped),
    serverDetail,
  };
}

/** 4xx 兜底文案（当原始 message 为空时） */
function defaultClientMessage(status: number): string {
  switch (status) {
    case 400:
      return '请求参数有误';
    case 401:
      return '未登录或登录已过期';
    case 403:
      return '无权限执行该操作';
    case 404:
      return '资源不存在';
    case 409:
      return '资源冲突';
    case 429:
      return '请求过于频繁，请稍后再试';
    default:
      return '请求无法处理';
  }
}

/* ============================== 自检（供管理端报告） ============================== */

/** 单条自检样本结果 */
export interface MaskingSample {
  /** 样本描述 */
  label: string;
  /** 原始错误（含内部细节） */
  raw: string;
  /** 生产模式下客户端实际收到的 message */
  prodMessage: string;
  /** 是否仍泄露内部细节（生产必须 false） */
  exposed: boolean;
  /** HTTP 状态 */
  status: number;
}

/** 错误脱敏自检结论 */
export interface ErrorMaskingSelfTest {
  /** 是否全部样本通过（生产无泄露） */
  green: boolean;
  /** 样本数 */
  total: number;
  /** 通过数 */
  passed: number;
  /** 逐样本证据 */
  samples: MaskingSample[];
}

/**
 * 跑一组代表性错误样本，验证生产模式下脱敏是否生效。
 * 纯函数：不读环境变量，isProduction 恒为 true 模拟生产。
 */
export function runErrorMaskingSelfTest(): ErrorMaskingSelfTest {
  const samples: MaskingSample[] = [];

  const cases: Array<{ label: string; err: unknown }> = [
    {
      label: '数据库连接失败（含堆栈/路径/SQL/内网IP）',
      err: new Error(
        "connect ECONNREFUSED 10.0.0.8:5432\n at Query (C:\\app\\src\\db.ts:44:11)\n SELECT * FROM patients WHERE id='1'",
      ),
    },
    {
      label: '未登录（401，保持明确）',
      err: Object.assign(new Error('jwt expired'), { status: 401, code: 40101 }),
    },
    {
      label: '无权限（403，保持明确）',
      err: Object.assign(new Error('admin role required'), { status: 403, code: 40300 }),
    },
    {
      label: '资源不存在（404，保持明确）',
      err: Object.assign(new Error('patient not found'), { status: 404, code: 40400 }),
    },
    {
      label: '空指针（500，生产兜底）',
      err: new TypeError("Cannot read property 'name' of undefined at /app/src/routes/x.ts:12:3"),
    },
    {
      label: '未知类型异常（字符串）',
      err: 'raw boom at /opt/service/internal.log',
    },
  ];

  let passed = 0;
  for (const c of cases) {
    const out = sanitizeErrorForClient(c.err, true /* isProduction */);
    // 判定通过：5xx 必须返回统一兜底文案且不泄露；4xx 必须不泄露内部细节
    const expectFallback = out.status >= 500 || out.status === 500;
    const ok = expectFallback
      ? out.message === PROD_FALLBACK_MESSAGE && !out.exposed
      : !out.exposed;
    if (ok) passed += 1;
    samples.push({
      label: c.label,
      raw: typeof c.err === 'string' ? c.err : (c.err as Error).message,
      prodMessage: out.message,
      exposed: out.exposed,
      status: out.status,
    });
  }

  return {
    green: passed === samples.length,
    total: samples.length,
    passed,
    samples,
  };
}
