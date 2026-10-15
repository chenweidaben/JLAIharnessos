/**
 * MEDMUSE BFF 运行时环境变量配置。
 *
 * 统一从 process.env 读取生产部署所需的关键配置，提供：
 *  - 默认值：缺省时回退安全默认值，避免启动即崩；
 *  - 纯函数解析：parseEnv(envRecord) 不触发任何副作用，便于单元测试；
 *  - 缺失告警：loadEnv() 在关键项缺失时 console.warn（不阻断启动）。
 *
 * 生产环境务必通过容器编排 / KMS 注入真实密钥，严禁在代码中硬编码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 运行时配置（全部为已解析后的强类型值） */
export interface EnvConfig {
  /** OpenAI 兼容 LLM 的 base URL（已去除尾部斜杠） */
  llmApiEndpoint: string;
  /** 调用 LLM 的 Bearer 密钥 */
  llmApiKey: string;
  /** 模型名称 */
  llmModel: string;
  /** RADAR 推理端点（RADAR_ENDPOINT 优先；缺省回退 llmApiEndpoint） */
  radarEndpoint: string;
  /** RADAR 推理密钥（RADAR_API_KEY 优先；缺省回退 llmApiKey） */
  radarApiKey: string;
  /** RADAR 模型名（RADAR_MODEL 优先；缺省回退 llmModel） */
  radarModel: string;
  /** 单次推理请求超时（毫秒），默认 30000 */
  timeoutMs: number;
  /** 失败重试次数（不含首次尝试），默认 3 */
  maxRetries: number;
  /** HTTP 监听端口 */
  port: number;
  /** PostgreSQL 连接串（演示模式可为空） */
  databaseUrl: string;
  /** 是否演示模式：=1/true/yes 时跳过数据库、使用内存数据 */
  demoMode: boolean;
  /** 运行环境：development | test | production */
  nodeEnv: string;
}

/** 默认 LLM 端点（仅用于本地回环开发，生产必须由环境变量覆盖） */
export const DEFAULT_LLM_API_ENDPOINT = 'http://localhost:8000/v1';
/** 默认模型（占位，生产由 LLM_MODEL 覆盖） */
export const DEFAULT_LLM_MODEL = 'qwen2.5-72b-instruct';
/** 默认占位密钥（仅本地回环，生产由 LLM_API_KEY 覆盖） */
export const DEFAULT_LLM_API_KEY = 'sk-local';
/** 默认监听端口 */
export const DEFAULT_PORT = 8080;
/** 默认单次推理请求超时（毫秒） */
export const DEFAULT_TIMEOUT_MS = 30_000;
/** 默认失败重试次数（不含首次尝试） */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * 将宽松环境变量值解析为布尔真值。
 * 接受 '1' / 'true' / 'yes'（大小写不敏感）为真，其余为假。
 */
function toBool(v: string | undefined): boolean {
  return v === '1' || v?.toLowerCase() === 'true' || v?.toLowerCase() === 'yes';
}

/** 将环境变量值解析为合法端口；非法时回退默认端口。 */
function toPort(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 65536 ? Math.floor(n) : DEFAULT_PORT;
}

/**
 * 将环境变量值解析为正整数；非法 / 非正时回退指定默认值。
 * 用于 TIMEOUT_MS、MAX_RETRIES 等运行参数，缺省走安全默认值。
 */
function toPositiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * 纯函数：从给定环境变量记录解析运行时配置。
 *
 * 无任何副作用（不读 process.env、不 console、不抛错），便于在单测中
 * 传入任意环境变量快照。兼容旧变量名作为回退：
 *  - RADAR_ENDPOINT  <- LLM_API_ENDPOINT <- LLM_BASE_URL <- MEDMUSE_MODEL_BASE_URL
 *  - RADAR_API_KEY  <- LLM_API_KEY       <- MEDMUSE_MODEL_API_KEY
 *  - RADAR_MODEL    <- LLM_MODEL         <- MEDMUSE_MODEL_NAME
 *  - TIMEOUT_MS（默认 30000）/ MAX_RETRIES（默认 3）
 *  - PORT              <- HTTP_PORT
 *
 * @param env 环境变量键值记录（如 process.env 的快照）
 * @returns 解析后的强类型配置
 */
export function parseEnv(env: Record<string, string | undefined>): EnvConfig {
  const rawEndpoint =
    env.LLM_API_ENDPOINT ?? env.LLM_BASE_URL ?? env.MEDMUSE_MODEL_BASE_URL ?? DEFAULT_LLM_API_ENDPOINT;
  const llmApiEndpoint = rawEndpoint.replace(/\/+$/, '');
  const llmApiKey = env.LLM_API_KEY ?? env.MEDMUSE_MODEL_API_KEY ?? DEFAULT_LLM_API_KEY;
  const llmModel = env.LLM_MODEL ?? env.MEDMUSE_MODEL_NAME ?? DEFAULT_LLM_MODEL;
  return {
    llmApiEndpoint,
    llmApiKey,
    llmModel,
    // RADAR_* 优先于 LLM_*；缺省即与 LLM 配置一致
    radarEndpoint: (env.RADAR_ENDPOINT ?? rawEndpoint).replace(/\/+$/, ''),
    radarApiKey: env.RADAR_API_KEY ?? llmApiKey,
    radarModel: env.RADAR_MODEL ?? llmModel,
    timeoutMs: toPositiveInt(env.TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxRetries: toPositiveInt(env.MAX_RETRIES, DEFAULT_MAX_RETRIES),
    port: toPort(env.PORT ?? env.HTTP_PORT),
    databaseUrl: env.DATABASE_URL ?? '',
    demoMode: toBool(env.DEMO_MODE),
    nodeEnv: env.NODE_ENV ?? 'development',
  };
}

let _cached: EnvConfig | null = null;

/**
 * 加载（并缓存）运行时配置。
 *
 * 在关键配置缺失时 console.warn 提示，但不抛错、不阻断启动：
 * 生产环境缺失密钥/端点应由部署方通过告警平台发现，本地开发则走默认/演示模式。
 */
export function loadEnv(): EnvConfig {
  if (_cached) return _cached;
  const env = process.env as Record<string, string | undefined>;
  const cfg = parseEnv(env);

  if (!env.RADAR_ENDPOINT && !env.LLM_API_ENDPOINT && !env.LLM_BASE_URL && !env.MEDMUSE_MODEL_BASE_URL) {
    // eslint-disable-next-line no-console
    console.warn(`[env] 未配置 RADAR_ENDPOINT，使用默认回环地址：${cfg.radarEndpoint}`);
  }
  if (!env.RADAR_API_KEY && !env.LLM_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[env] 未配置 RADAR_API_KEY，模型调用将使用占位密钥（生产环境请通过 KMS/密钥管理下发）');
  }
  if (!cfg.demoMode && !cfg.databaseUrl) {
    // eslint-disable-next-line no-console
    console.warn('[env] 未配置 DATABASE_URL 且非 DEMO_MODE，数据库将无法连接');
  }
  if (cfg.demoMode) {
    // eslint-disable-next-line no-console
    console.warn('[env] DEMO_MODE=1：以演示模式运行，使用内存数据，不持久化');
  }

  _cached = cfg;
  return cfg;
}

/** 测试专用：清空配置缓存，使下次 loadEnv 重新读取 process.env。 */
export function _resetEnvCache(): void {
  _cached = null;
}

/** 取已加载的运行时配置（惰性初始化）。 */
export function getEnv(): EnvConfig {
  return loadEnv();
}
