/**
 * 健澜科技 jlmedaios - BFF 轻量查询缓存（TTL 内存缓存）
 *
 * 背景：学习引擎在一次 agent 会话内会被高频重复读取（患者画像 / 医生偏好 /
 * 科室知识），而这些「已沉淀快照」在短窗口内几乎不变。为避免同一会话内
 * 对同一 doctor+patient 组合反复打库聚合，提供一个零依赖、纯函数式的
 * 简单内存缓存工厂：
 *
 *   const cache = createCache(30_000); // 30s TTL
 *   cache.set('key', value);
 *   cache.get('key'); // 命中返回 value；过期 / 未命中返回 undefined
 *   cache.clear();    // 清空全部条目
 *
 * 设计口径：
 *  - 纯函数工厂：createCache(ttlMs) 返回闭包 { get, set, clear }，
 *    不修改入参、不读环境、不挂全局，给定时钟行为恒定，便于单测与回放；
 *  - 懒过期：仅在 get 时判断过期，过期条目即时剔除并返回 undefined，
 *    不启动后台定时器，进程退出无残留；
 *  - 负缓存友好：null / 空对象等「降级结果」同样可缓存，调用方无需区分；
 *  - 安全边界：缓存的是已脱敏的学习快照（不含患者姓名 / 身份证号等
 *    直接标识符），TTL 窗口内内存驻留不触碰宪法第三章红线；
 *  - 进程级内存：单实例 BFF 内有效，多副本 / 多进程间不共享——
 *    本缓存仅用于削峰（防同会话重复聚合），不承担分布式一致性职责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 缓存条目：值 + 绝对过期时间戳（Date.now() 毫秒基准） */
interface CacheEntry<T> {
  /** 缓存的业务值（可为 null / 空结构等负缓存结果） */
  value: T;
  /** 过期时刻（epoch ms）；Date.now() >= expiresAt 即视为过期 */
  expiresAt: number;
}

/**
 * TTL 内存缓存句柄。
 *
 * @typeParam T 缓存值类型（默认 unknown，由调用方按场景收窄）
 */
export interface QueryCache<T = unknown> {
  /**
   * 读取缓存。
   *
   * @param key 缓存键（调用方保证业务语义唯一，如 `${doctorId}|${patientId}`）
   * @returns 命中且未过期时返回缓存值；未命中或已过期返回 undefined
   *          （过期条目会被惰性剔除）
   */
  get(key: string): T | undefined;

  /**
   * 写入 / 覆盖缓存条目，TTL 从写入时刻起重新计时。
   *
   * @param key   缓存键
   * @param value 待缓存值（任意类型，含 null / 空数组等负缓存结果）
   */
  set(key: string, value: T): void;

  /**
   * 清空全部缓存条目（用于学习数据手动刷新 / 故障恢复后的强制重算）。
   */
  clear(): void;
}

/**
 * createCache：构造一个带固定 TTL 的简单内存缓存。
 *
 * 用法：
 * ```ts
 * const cache = createCache<AgentContextBundle>(30_000);
 * cache.set('d100|p200', bundle);
 * const hit = cache.get('d100|p200'); // 30s 内命中，否则 undefined
 * ```
 *
 * 注意：
 *  - TTL 必须为非负有限数；0 表示「写入即过期」（get 恒 miss），主要用于测试；
 *  - 缓存实例自身为闭包私有 Map，不与其他实例共享；
 *  - 不做容量上限淘汰（LRU）——学习快照键空间小（doctor×patient 量级），
 *    进程重启自然回收，避免引入额外依赖。
 *
 * @typeParam T 缓存值类型
 * @param ttlMs 条目存活时长（毫秒）
 * @returns { get, set, clear } 缓存句柄
 * @throws 当 ttlMs 不是有限非负数时抛出 RangeError
 */
export function createCache<T = unknown>(ttlMs: number): QueryCache<T> {
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new RangeError(`createCache: ttlMs 必须为有限非负数，收到 ${ttlMs}`);
  }

  /** 私有存储：键 -> 条目；不导出，杜绝外部绕过 TTL 直改 */
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      // 懒过期：命中即检查，过期当场剔除
      if (Date.now() >= entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },

    clear(): void {
      store.clear();
    },
  };
}
