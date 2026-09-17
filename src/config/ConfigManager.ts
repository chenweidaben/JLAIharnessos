/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 配置管理器（ConfigManager）
 *
 * 职责：
 * 1. 加载 config/ 下按环境拆分的默认配置
 * 2. 从 process.env 注入敏感值与环境覆盖
 * 3. 使用 zod schema 做运行期校验
 * 4. 提供单例访问，并在开发环境支持热重载
 * 5. 记录配置变更审计日志（写入审计通道）
 */

import { z } from 'zod';

import { type AppConfig, buildBaseConfig, type NodeEnv } from '../../config/index';

/** zod 校验 schema（与 AppConfig 对齐） */
const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'critical']);

const AppConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']),
  appName: z.string().min(1),
  appVersion: z.string().min(1),
  httpPort: z.number().int().min(1).max(65535),
  httpTimeoutMs: z.number().int().positive(),
  llm: z.object({
    provider: z.enum(['anthropic', 'openai', 'local']),
    apiKey: z.string(),
    model: z.string().min(1),
    baseUrl: z.string().url(),
    maxTokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2),
    timeoutMs: z.number().int().positive(),
  }),
  integration: z.object({
    hisBaseUrl: z.string(),
    hisApiKey: z.string(),
    hisTimeoutMs: z.number().int().positive(),
    emrBaseUrl: z.string(),
    emrApiKey: z.string(),
    lisBaseUrl: z.string(),
    pacsBaseUrl: z.string(),
  }),
  logging: z.object({
    level: LogLevelSchema,
    dir: z.string().min(1),
    maxSizeBytes: z.number().int().positive(),
    maxFiles: z.number().int().positive(),
    auditRetentionDays: z.number().int().min(30),
  }),
  security: z.object({
    encryptionMasterKey: z.string(),
    jwtSecret: z.string(),
    enableDesensitization: z.boolean(),
    enablePromptGuard: z.boolean(),
  }),
  monitoring: z.object({
    sentryDsn: z.string().url().optional().or(z.literal('')),
    perfApiTimeoutMs: z.number().int().positive(),
    perfToolTimeoutMs: z.number().int().positive(),
    healthCheckPath: z.string().startsWith('/'),
  }),
});

/** 环境变量到配置字段的映射 */
function applyEnvOverrides(base: AppConfig): AppConfig {
  const env = process.env;
  const next: AppConfig = structuredClone(base);

  if (env.LOG_LEVEL) next.logging.level = env.LOG_LEVEL as AppConfig['logging']['level'];
  if (env.LOG_DIR) next.logging.dir = env.LOG_DIR;
  if (env.LOG_MAX_SIZE) next.logging.maxSizeBytes = Number(env.LOG_MAX_SIZE);
  if (env.LOG_MAX_FILES) next.logging.maxFiles = Number(env.LOG_MAX_FILES);
  if (env.AUDIT_RETENTION_DAYS) next.logging.auditRetentionDays = Number(env.AUDIT_RETENTION_DAYS);

  if (env.LLM_API_KEY) next.llm.apiKey = env.LLM_API_KEY;
  if (env.LLM_MODEL) next.llm.model = env.LLM_MODEL;
  if (env.LLM_BASE_URL) next.llm.baseUrl = env.LLM_BASE_URL;
  if (env.LLM_TIMEOUT_MS) next.llm.timeoutMs = Number(env.LLM_TIMEOUT_MS);

  if (env.HIS_BASE_URL) next.integration.hisBaseUrl = env.HIS_BASE_URL;
  if (env.HIS_API_KEY) next.integration.hisApiKey = env.HIS_API_KEY;
  if (env.EMR_BASE_URL) next.integration.emrBaseUrl = env.EMR_BASE_URL;
  if (env.SENTRY_DSN) next.monitoring.sentryDsn = env.SENTRY_DSN;
  if (env.HEALTH_CHECK_PATH) next.monitoring.healthCheckPath = env.HEALTH_CHECK_PATH;

  if (env.ENABLE_DESENSITIZATION !== undefined)
    next.security.enableDesensitization = env.ENABLE_DESENSITIZATION === 'true';
  if (env.ENCRYPTION_MASTER_KEY) next.security.encryptionMasterKey = env.ENCRYPTION_MASTER_KEY;
  if (env.JWT_SECRET) next.security.jwtSecret = env.JWT_SECRET;

  return next;
}

type AuditSink = (entry: {
  action: string;
  timestamp: number;
  detail: Record<string, unknown>;
}) => void;

/**
 * 配置管理器单例
 *
 * @example
 * ```typescript
 * const config = ConfigManager.getInstance().get();
 * console.log(config.llm.model);
 * ```
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;

  private config: AppConfig;
  private readonly loadedAt: number;
  private auditSink: AuditSink | null = null;

  private constructor(env: NodeEnv) {
    this.config = applyEnvOverrides(buildBaseConfig(env));
    this.validate(this.config);
    this.loadedAt = Date.now();
  }

  /** 获取全局单例 */
  public static getInstance(env?: NodeEnv): ConfigManager {
    if (!ConfigManager.instance) {
      const resolvedEnv: NodeEnv = env ?? this.resolveEnv();
      ConfigManager.instance = new ConfigManager(resolvedEnv);
    }
    return ConfigManager.instance;
  }

  /** 测试用：重置单例 */
  public static reset(): void {
    ConfigManager.instance = null;
  }

  /** 从 process.env 推断运行环境 */
  private static resolveEnv(): NodeEnv {
    const raw = (process.env.NODE_ENV ?? 'development').toLowerCase();
    if (raw === 'test' || raw === 'production') return raw;
    return 'development';
  }

  /** 注册审计回调（由启动装配时注入） */
  public setAuditSink(sink: AuditSink): void {
    this.auditSink = sink;
  }

  /** 获取当前配置（只读） */
  public get(): Readonly<AppConfig> {
    return this.config;
  }

  /**
   * 热更新配置（开发环境使用）
   *
   * 重新读取环境变量并校验；校验失败不生效。
   */
  public reload(): void {
    const next = applyEnvOverrides(buildBaseConfig(this.config.nodeEnv));
    this.validate(next);
    const prev = this.config;
    this.config = next;
    this.audit('config_reloaded', {
      changedKeys: this.diffKeys(prev, next),
      at: new Date().toISOString(),
    });
  }

  /** 运行期校验 */
  private validate(cfg: AppConfig): void {
    const result = AppConfigSchema.safeParse(cfg);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`配置校验失败：${issues}`);
    }
  }

  private diffKeys(a: unknown, b: unknown, prefix = ''): string[] {
    const out: string[] = [];
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(aObj ?? {}), ...Object.keys(bObj ?? {})]);
    for (const k of keys) {
      const path = prefix ? `${prefix}.${k}` : k;
      const av = aObj?.[k];
      const bv = bObj?.[k];
      if (typeof av === 'object' && typeof bv === 'object' && av !== null && bv !== null) {
        out.push(...this.diffKeys(av, bv, path));
      } else if (av !== bv) {
        out.push(path);
      }
    }
    return out;
  }

  private audit(action: string, detail: Record<string, unknown>): void {
    this.auditSink?.({ action, timestamp: Date.now(), detail });
  }

  /** 加载时间 */
  public getLoadedAt(): number {
    return this.loadedAt;
  }
}

export type { AppConfig } from '../../config/index';
