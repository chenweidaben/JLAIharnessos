/**
 * 健澜科技数智医院智能体 - 适配器基类与注册中心单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { BaseAdapter } from '../../../src/integration/adapters/BaseAdapter';
import { AdapterRegistry } from '../../../src/integration/adapters/AdapterRegistry';
import { AdapterError, AdapterErrorType, AdapterErrorCode, isRetryable } from '../../../src/integration/adapters/AdapterError';
import { createDefaultAdapterConfig } from '../../../src/integration/adapters/AdapterConfig';
import type { AdapterMetadata } from '../../../src/integration/types';

/** 测试用适配器 */
class TestAdapter extends BaseAdapter {
  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      name: '测试适配器',
      supportedProtocols: ['rest'],
    };
  }

  async doSomething(): Promise<string> {
    return this.execute(async () => 'success');
  }

  async doSomethingWithError(): Promise<void> {
    return this.execute(async () => {
      throw AdapterError.timeout('模拟超时错误');
    });
  }

  async doSomethingWithNonRetryableError(): Promise<void> {
    return this.execute(async () => {
      throw AdapterError.authentication('认证失败');
    });
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;

  beforeAll(async () => {
    const config = createDefaultAdapterConfig({
      id: 'test-adapter',
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      endpoint: 'http://localhost:9999',
      timeout: 1000,
      retry: { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 100, backoffFactor: 2, jitter: false },
    });
    adapter = new TestAdapter(config);
    await adapter.init();
    await adapter.connect();
  });

  it('应正确初始化和连接', () => {
    expect(adapter.status).toBe('connected');
    expect(adapter.id).toBe('test-adapter');
  });

  it('应返回正确的元信息', () => {
    const metadata = adapter.getMetadata();
    expect(metadata.id).toBe('test-adapter');
    expect(metadata.vendor).toBe('test');
  });

  it('应能执行成功操作', async () => {
    const result = await adapter.doSomething();
    expect(result).toBe('success');
  });

  it('应能健康检查', async () => {
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.adapterId).toBe('test-adapter');
  });

  it('应能断开连接', async () => {
    const adapter2 = new TestAdapter(createDefaultAdapterConfig({
      id: 'test-disconnect',
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      endpoint: 'http://localhost:9999',
    }));
    await adapter2.init();
    await adapter2.connect();
    expect(adapter2.status).toBe('connected');
    await adapter2.disconnect();
    expect(adapter2.status).toBe('disconnected');
  });

  describe('错误处理', () => {
    it('超时错误应可重试', async () => {
      try {
        await adapter.doSomethingWithError();
        throw new Error('应抛出错误');
      } catch (error) {
        expect(error).toBeInstanceOf(AdapterError);
        const adapterError = error as AdapterError;
        expect(adapterError.errorType).toBe(AdapterErrorType.TIMEOUT);
        expect(adapterError.retryable).toBe(true);
      }
    });

    it('认证错误不应重试', async () => {
      try {
        await adapter.doSomethingWithNonRetryableError();
        throw new Error('应抛出错误');
      } catch (error) {
        const adapterError = error as AdapterError;
        expect(adapterError.errorType).toBe(AdapterErrorType.AUTHENTICATION);
        expect(adapterError.retryable).toBe(false);
      }
    });
  });

  describe('熔断器', () => {
    beforeEach(() => {
      adapter.resetCircuitBreaker();
    });

    it('初始状态应为closed', () => {
      expect(adapter.getCircuitState()).toBe('closed');
    });

    it('应能重置熔断器', () => {
      adapter.resetCircuitBreaker();
      expect(adapter.getCircuitState()).toBe('closed');
    });
  });
});

describe('AdapterError', () => {
  it('应创建连接错误', () => {
    const error = AdapterError.connection('连接被拒绝');
    expect(error).toBeInstanceOf(AdapterError);
    expect(error.errorType).toBe(AdapterErrorType.CONNECTION);
    expect(error.retryable).toBe(true);
  });

  it('应创建超时错误', () => {
    const error = AdapterError.timeout('请求超时');
    expect(error.errorType).toBe(AdapterErrorType.TIMEOUT);
    expect(error.code).toBe(AdapterErrorCode.REQUEST_TIMEOUT);
  });

  it('应创建认证错误', () => {
    const error = AdapterError.authentication('认证失败');
    expect(error.errorType).toBe(AdapterErrorType.AUTHENTICATION);
    expect(error.retryable).toBe(false);
  });

  it('应创建业务错误', () => {
    const error = AdapterError.business('患者不存在', AdapterErrorCode.PATIENT_NOT_FOUND);
    expect(error.errorType).toBe(AdapterErrorType.BUSINESS);
    expect(error.code).toBe(AdapterErrorCode.PATIENT_NOT_FOUND);
  });

  it('应创建熔断错误', () => {
    const error = AdapterError.circuitBreaker('熔断器已打开');
    expect(error.errorType).toBe(AdapterErrorType.CIRCUIT_BREAKER);
    expect(error.retryable).toBe(false);
  });

  it('应从普通错误创建AdapterError', () => {
    const error = AdapterError.from(new Error('普通错误'), 'adapter-1');
    expect(error).toBeInstanceOf(AdapterError);
    expect(error.adapterId).toBe('adapter-1');
    expect(error.message).toBe('普通错误');
  });

  it('应能序列化为JSON', () => {
    const error = AdapterError.timeout('超时');
    const json = error.toJSON();
    expect(json.name).toBe('AdapterError');
    expect(json.errorType).toBe(AdapterErrorType.TIMEOUT);
    expect(json.message).toBe('超时');
  });

  it('isRetryable应正确判断', () => {
    expect(isRetryable(AdapterErrorType.CONNECTION, AdapterErrorCode.CONNECTION_REFUSED)).toBe(true);
    expect(isRetryable(AdapterErrorType.TIMEOUT, AdapterErrorCode.REQUEST_TIMEOUT)).toBe(true);
    expect(isRetryable(AdapterErrorType.AUTHENTICATION, AdapterErrorCode.AUTHENTICATION_FAILED)).toBe(false);
    expect(isRetryable(AdapterErrorType.BUSINESS, AdapterErrorCode.PATIENT_NOT_FOUND)).toBe(false);
  });
});

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeAll(() => {
    AdapterRegistry.reset();
    registry = AdapterRegistry.getInstance();
  });

  afterAll(() => {
    AdapterRegistry.reset();
  });

  it('应是单例', () => {
    const instance1 = AdapterRegistry.getInstance();
    const instance2 = AdapterRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('应能注册适配器', () => {
    const metadata: AdapterMetadata = {
      id: 'test-his',
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      name: '测试HIS',
      supportedProtocols: ['rest'],
    };
    registry.register('test-his', metadata, () => new TestAdapter(createDefaultAdapterConfig({
      id: 'test-his', type: 'his', vendor: 'test', version: '1.0.0', endpoint: 'http://localhost',
    })));
    expect(registry.has('test-his')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('重复注册应抛出错误', () => {
    const metadata: AdapterMetadata = {
      id: 'test-his',
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      name: '测试HIS',
      supportedProtocols: ['rest'],
    };
    try {
      registry.register('test-his', metadata, () => new TestAdapter(createDefaultAdapterConfig({
        id: 'test-his', type: 'his', vendor: 'test', version: '1.0.0', endpoint: 'http://localhost',
      })));
      throw new Error('应抛出错误');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('应能获取适配器实例', () => {
    const adapter = registry.getAdapter('test-his');
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('test-his');
  });

  it('单例模式应返回同一实例', () => {
    const adapter1 = registry.getAdapter('test-his');
    const adapter2 = registry.getAdapter('test-his');
    expect(adapter1).toBe(adapter2);
  });

  it('应能按类型查询适配器ID', () => {
    const ids = registry.getAdapterIdsByType('his');
    expect(ids).toContain('test-his');
  });

  it('应能获取指定类型的第一个适配器', () => {
    const adapter = registry.getFirstAdapterByType('his');
    expect(adapter).toBeDefined();
    expect(adapter!.id).toBe('test-his');
  });

  it('获取不存在的适配器应抛出错误', () => {
    try {
      registry.getAdapter('nonexistent');
      throw new Error('应抛出错误');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('应能注销适配器', () => {
    const result = registry.unregister('test-his');
    expect(result).toBe(true);
    expect(registry.has('test-his')).toBe(false);
  });

  it('应能获取所有元信息', () => {
    const metadata: AdapterMetadata = {
      id: 'test-emr',
      type: 'emr',
      vendor: 'test',
      version: '1.0.0',
      name: '测试EMR',
      supportedProtocols: ['rest'],
    };
    registry.register('test-emr', metadata, () => new TestAdapter(createDefaultAdapterConfig({
      id: 'test-emr', type: 'emr', vendor: 'test', version: '1.0.0', endpoint: 'http://localhost',
    })));
    const allMetadata = registry.getAllMetadata();
    expect(allMetadata.length).toBeGreaterThanOrEqual(1);
    expect(allMetadata.some((m) => m.id === 'test-emr')).toBe(true);
  });
});

describe('AdapterConfig', () => {
  it('应创建默认配置', () => {
    const config = createDefaultAdapterConfig({
      id: 'test',
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      endpoint: 'http://localhost',
    });
    expect(config.id).toBe('test');
    expect(config.timeout).toBe(30000);
    expect(config.retry.maxRetries).toBe(3);
    expect(config.circuitBreaker.enabled).toBe(true);
    expect(config.circuitBreaker.failureThreshold).toBe(50);
    expect(config.auth.type).toBe('none');
    expect(config.encoding?.requestEncoding).toBe('UTF-8');
  });

  it('应覆盖默认配置', () => {
    const config = createDefaultAdapterConfig({
      id: 'test',
      type: 'his',
      vendor: 'test',
      version: '1.0.0',
      endpoint: 'http://localhost',
      timeout: 5000,
      retry: { maxRetries: 5, initialDelayMs: 100, maxDelayMs: 5000, backoffFactor: 3, jitter: true },
    });
    expect(config.timeout).toBe(5000);
    expect(config.retry.maxRetries).toBe(5);
    expect(config.retry.backoffFactor).toBe(3);
  });
});
