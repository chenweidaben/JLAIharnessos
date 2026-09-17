/**
 * 健澜科技杠OS - 缓存抽象层类型
 *
 * 统一内存（开发/测试）与 Redis（生产）两套实现，上层分布式锁、限流、
 * 会话、缓存旁路均只依赖 ICache 接口，便于本地零依赖运行与 CI 测试。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

/** 可缓存值（必须 JSON 可序列化） */
export type CacheValue = string | number | boolean | null | CacheValue[] | { [k: string]: CacheValue };

export interface CacheHealth {
  ok: boolean;
  driver: 'memory' | 'redis';
  latencyMs?: number;
  error?: string;
}

export interface ICache {
  /** 驱动标识 */
  readonly driver: 'memory' | 'redis';

  /** 读取并反序列化；不存在返回 null */
  get<T = CacheValue>(key: string): Promise<T | null>;

  /** 写入（ttlMs 为空则永久，单位毫秒） */
  set<T = CacheValue>(key: string, value: T, ttlMs?: number): Promise<void>;

  /** 删除，返回是否删除了一个存在的键 */
  del(key: string): Promise<boolean>;

  exists(key: string): Promise<boolean>;

  /** 设置过期；键不存在返回 false */
  expire(key: string, ttlMs: number): Promise<boolean>;

  /** 剩余 TTL（毫秒）：-1 永久，-2 不存在 */
  ttl(key: string): Promise<number>;

  /** 仅当键不存在时写入并设置 TTL（SET NX PX），返回是否设置成功 */
  setNx(key: string, value: CacheValue, ttlMs: number): Promise<boolean>;

  /**
   * 原子自增并在键首次创建时设置过期（固定窗口限流原语）。
   * 返回自增后的值。
   */
  incrAndExpire(key: string, ttlMs: number, by?: number): Promise<number>;

  /**
   * 安全释放锁：仅当键值等于 token 时删除（compare-and-delete，原子）。
   * 返回是否释放成功。
   */
  releaseIfValue(key: string, token: string): Promise<boolean>;

  /**
   * 续期锁：仅当键值等于 token 时刷新 TTL（看门狗）。
   */
  renewIfValue(key: string, token: string, ttlMs: number): Promise<boolean>;

  /** 批量读取（与 keys 顺序对齐，缺失为 null） */
  mget<T = CacheValue>(keys: string[]): Promise<Array<T | null>>;

  /** 按 glob 模式删除（如 jianlan:agent:*），返回删除数量；生产用 scan 不用 keys */
  deletePattern(pattern: string): Promise<number>;

  /** 健康探测 */
  ping(): Promise<CacheHealth>;

  /** 关闭连接 / 清理 */
  close(): Promise<void>;
}

/** 统一键命名：jianlan:<domain>:<...>，避免与其他服务冲突并便于按域清理 */
export function cacheKey(domain: string, ...parts: Array<string | number>): string {
  return ['jianlan', domain, ...parts.map((p) => String(p))].join(':');
}
