/**
 * 健澜科技数智医院智能体 - 厂商HIS适配器骨架单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import { VendorCHISAdapter } from '../../../src/integration/adapters/his/VendorCHISAdapter';
import { VendorBHISAdapter } from '../../../src/integration/adapters/his/VendorBHISAdapter';
import { VendorDHISAdapter } from '../../../src/integration/adapters/his/VendorDHISAdapter';
import { VendorEHISAdapter } from '../../../src/integration/adapters/his/VendorEHISAdapter';

describe('VendorCHISAdapter', () => {
  it('应返回正确元信息', () => {
    const adapter = new VendorCHISAdapter();
    const meta = adapter.getMetadata();
    expect(meta.vendor).toBe('HIS厂商C');
    expect(meta.type).toBe('his');
  });

  it('未实现方法应抛出错误', async () => {
    const adapter = new VendorCHISAdapter();
    await expect(adapter.getPatientInfo('P1')).rejects.toThrow(/尚未实现/);
    await expect(adapter.batchCreateOrders([])).rejects.toThrow(/尚未实现/);
  });
});

describe('VendorBHISAdapter', () => {
  it('应返回厂商B元信息', () => {
    const adapter = new VendorBHISAdapter();
    expect(adapter.getMetadata().vendor).toBe('HIS厂商B');
  });

  it('新接口方法应抛出未实现', async () => {
    const adapter = new VendorBHISAdapter();
    await expect(adapter.getAsyncTaskStatus('T1')).rejects.toThrow(/尚未实现/);
  });
});

describe('VendorDHISAdapter', () => {
  it('应返回厂商D元信息', () => {
    const adapter = new VendorDHISAdapter();
    expect(adapter.getMetadata().vendor).toBe('HIS厂商D');
  });
});

describe('VendorEHISAdapter', () => {
  it('应返回厂商E元信息', () => {
    const adapter = new VendorEHISAdapter();
    expect(adapter.getMetadata().vendor).toBe('HIS厂商E');
  });

  it('取消医嘱应抛出未实现', async () => {
    const adapter = new VendorEHISAdapter();
    await expect(adapter.cancelOrder('ORD1')).rejects.toThrow(/尚未实现/);
  });
});
