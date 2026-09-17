/**
 * 健澜科技数智医院智能体 - integration/adapters/AdapterRegistry.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 适配器注册中心
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 负责适配器的注册、发现、实例管理和健康状态监控。
 * 支持单例和多实例模式，按类型查询适配器。
 *
 * @module integration/adapters/AdapterRegistry
 */

import type { AdapterHealth, AdapterMetadata, AdapterType } from '../types';
import { AdapterError, AdapterErrorCode } from './AdapterError';
import type { BaseAdapter } from './BaseAdapter';

/** 适配器工厂函数 */
export type AdapterFactory = () => BaseAdapter;

/** 适配器注册项 */
interface AdapterRegistration {
  /** 适配器元信息 */
  metadata: AdapterMetadata;
  /** 工厂函数（用于创建新实例） */
  factory: AdapterFactory;
  /** 单例实例（如果是单例模式） */
  singleton?: BaseAdapter;
  /** 是否为单例模式 */
  isSingleton: boolean;
  /** 注册时间 */
  registeredAt: string;
}

/**
 * 适配器注册中心
 *
 * 全局单例，管理所有系统适配器的注册与发现。
 *
 * @example
 * ```typescript
 * const registry = AdapterRegistry.getInstance();
 * registry.register('his-winning', metadata, () => new WeiningHISAdapter(config), true);
 * const his = registry.getAdapter<HISAdapter>('his-winning');
 * ```
 */
export class AdapterRegistry {
  private static instance: AdapterRegistry | undefined;

  /** 注册项映射（adapterId → registration） */
  private readonly registrations = new Map<string, AdapterRegistration>();

  /** 类型索引（adapterType → Set<adapterId>） */
  private readonly typeIndex = new Map<AdapterType, Set<string>>();

  private constructor() {
    // 私有构造函数，使用 getInstance()
  }

  /**
   * 获取注册中心单例
   */
  static getInstance(): AdapterRegistry {
    AdapterRegistry.instance ??= new AdapterRegistry();
    return AdapterRegistry.instance;
  }

  /**
   * 重置注册中心（用于测试）
   */
  static reset(): void {
    AdapterRegistry.instance = undefined;
  }

  // ============================================================
  // 注册与注销
  // ============================================================

  /**
   * 注册适配器
   *
   * @param adapterId - 适配器唯一ID
   * @param metadata - 适配器元信息
   * @param factory - 适配器工厂函数
   * @param isSingleton - 是否为单例模式（默认 true）
   * @throws {AdapterError} 适配器已注册时抛出
   */
  register(
    adapterId: string,
    metadata: AdapterMetadata,
    factory: AdapterFactory,
    isSingleton = true,
  ): void {
    if (this.registrations.has(adapterId)) {
      throw new AdapterError(
        'CONFLICT' as never,
        AdapterErrorCode.DUPLICATE_ORDER,
        `适配器 [${adapterId}] 已注册`,
        { retryable: false },
      );
    }

    const registration: AdapterRegistration = {
      metadata,
      factory,
      isSingleton,
      registeredAt: new Date().toISOString(),
    };

    this.registrations.set(adapterId, registration);

    // 更新类型索引
    if (!this.typeIndex.has(metadata.type)) {
      this.typeIndex.set(metadata.type, new Set());
    }
    this.typeIndex.get(metadata.type)!.add(adapterId);

    console.info(`[AdapterRegistry] 适配器 [${adapterId}] (${metadata.vendor}) 注册成功`);
  }

  /**
   * 注销适配器
   *
   * @param adapterId - 适配器ID
   * @returns 是否成功注销
   */
  unregister(adapterId: string): boolean {
    const registration = this.registrations.get(adapterId);
    if (!registration) {
      return false;
    }

    // 断开单例连接
    if (registration.singleton) {
      registration.singleton.disconnect().catch(() => {
        // 忽略断开错误
      });
    }

    this.registrations.delete(adapterId);

    // 更新类型索引
    const typeSet = this.typeIndex.get(registration.metadata.type);
    if (typeSet) {
      typeSet.delete(adapterId);
      if (typeSet.size === 0) {
        this.typeIndex.delete(registration.metadata.type);
      }
    }

    console.info(`[AdapterRegistry] 适配器 [${adapterId}] 已注销`);
    return true;
  }

  // ============================================================
  // 适配器获取
  // ============================================================

  /**
   * 获取适配器实例
   *
   * 单例模式返回共享实例，多实例模式每次创建新实例。
   *
   * @typeParam T - 适配器类型
   * @param adapterId - 适配器ID
   * @returns 适配器实例
   * @throws {AdapterError} 适配器未注册时抛出
   */
  getAdapter<T extends BaseAdapter = BaseAdapter>(adapterId: string): T {
    const registration = this.registrations.get(adapterId);
    if (!registration) {
      throw new AdapterError(
        'NOT_FOUND' as never,
        AdapterErrorCode.PATIENT_NOT_FOUND,
        `适配器 [${adapterId}] 未注册`,
        { retryable: false },
      );
    }

    if (registration.isSingleton) {
      registration.singleton ??= registration.factory();
      return registration.singleton as T;
    }

    // 多实例模式：每次创建新实例
    return registration.factory() as T;
  }

  /**
   * 按类型获取适配器ID列表
   *
   * @param type - 适配器类型
   * @returns 适配器ID列表
   */
  getAdapterIdsByType(type: AdapterType): string[] {
    const set = this.typeIndex.get(type);
    return set ? Array.from(set) : [];
  }

  /**
   * 按类型获取所有适配器实例
   *
   * @typeParam T - 适配器类型
   * @param type - 适配器类型
   * @returns 适配器实例列表
   */
  getAdaptersByType<T extends BaseAdapter = BaseAdapter>(type: AdapterType): T[] {
    const ids = this.getAdapterIdsByType(type);
    return ids.map((id) => this.getAdapter<T>(id));
  }

  /**
   * 获取指定类型的第一个适配器
   *
   * 常用于只有一个该类型适配器的场景。
   *
   * @typeParam T - 适配器类型
   * @param type - 适配器类型
   * @returns 适配器实例，不存在则返回 undefined
   */
  getFirstAdapterByType<T extends BaseAdapter = BaseAdapter>(type: AdapterType): T | undefined {
    const ids = this.getAdapterIdsByType(type);
    if (ids.length === 0) {
      return undefined;
    }
    return this.getAdapter<T>(ids[0]);
  }

  // ============================================================
  // 查询与元信息
  // ============================================================

  /**
   * 检查适配器是否已注册
   */
  has(adapterId: string): boolean {
    return this.registrations.has(adapterId);
  }

  /**
   * 获取适配器元信息
   */
  getMetadata(adapterId: string): AdapterMetadata | undefined {
    return this.registrations.get(adapterId)?.metadata;
  }

  /**
   * 获取所有已注册适配器的元信息
   */
  getAllMetadata(): AdapterMetadata[] {
    return Array.from(this.registrations.values()).map((r) => r.metadata);
  }

  /**
   * 获取已注册适配器数量
   */
  get size(): number {
    return this.registrations.size;
  }

  // ============================================================
  // 健康监控
  // ============================================================

  /**
   * 获取所有适配器的健康状态
   *
   * @returns 健康状态列表
   */
  async getAllHealth(): Promise<AdapterHealth[]> {
    const healthList: AdapterHealth[] = [];

    for (const [id, registration] of this.registrations) {
      try {
        const adapter = this.getAdapter(id);
        const health = await adapter.healthCheck();
        healthList.push(health);
      } catch (error) {
        healthList.push({
          adapterId: id,
          adapterType: registration.metadata.type,
          vendor: registration.metadata.vendor,
          status: 'error',
          healthy: false,
          lastCheckAt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return healthList;
  }

  /**
   * 获取不健康的适配器列表
   */
  async getUnhealthyAdapters(): Promise<AdapterHealth[]> {
    const all = await this.getAllHealth();
    return all.filter((h) => !h.healthy);
  }

  // ============================================================
  // 生命周期管理
  // ============================================================

  /**
   * 初始化所有单例适配器
   */
  async initAll(): Promise<void> {
    for (const [id, registration] of this.registrations) {
      if (registration.isSingleton) {
        try {
          const adapter = this.getAdapter(id);
          await adapter.init();
        } catch (error) {
          console.error(`[AdapterRegistry] 初始化适配器 [${id}] 失败`, { error });
        }
      }
    }
  }

  /**
   * 连接所有单例适配器
   */
  async connectAll(): Promise<void> {
    for (const [id, registration] of this.registrations) {
      if (registration.isSingleton) {
        try {
          const adapter = this.getAdapter(id);
          await adapter.connect();
        } catch (error) {
          console.error(`[AdapterRegistry] 连接适配器 [${id}] 失败`, { error });
        }
      }
    }
  }

  /**
   * 断开所有单例适配器
   */
  async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [, registration] of this.registrations) {
      if (registration.singleton) {
        promises.push(registration.singleton.disconnect().catch(() => undefined));
      }
    }
    await Promise.all(promises);
  }
}
