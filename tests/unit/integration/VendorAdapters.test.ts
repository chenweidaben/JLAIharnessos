/**
 * 健澜科技数智医院智能体 - 厂商HIS适配器骨架单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import { DonghuaHISAdapter } from '../../../src/integration/adapters/his/DonghuaHISAdapter';
import { ChuangyeHISAdapter } from '../../../src/integration/adapters/his/ChuangyeHISAdapter';
import { LianzhongHISAdapter } from '../../../src/integration/adapters/his/LianzhongHISAdapter';
import { ZhiyeHISAdapter } from '../../../src/integration/adapters/his/ZhiyeHISAdapter';

describe('DonghuaHISAdapter', () => {
  it('应返回正确元信息', () => {
    const adapter = new DonghuaHISAdapter();
    const meta = adapter.getMetadata();
    expect(meta.vendor).toBe('东华医为');
    expect(meta.type).toBe('his');
  });

  it('未实现方法应抛出错误', async () => {
    const adapter = new DonghuaHISAdapter();
    await expect(adapter.getPatientInfo('P1')).rejects.toThrow(/尚未实现/);
    await expect(adapter.batchCreateOrders([])).rejects.toThrow(/尚未实现/);
  });
});

describe('ChuangyeHISAdapter', () => {
  it('应返回创业慧康元信息', () => {
    const adapter = new ChuangyeHISAdapter();
    expect(adapter.getMetadata().vendor).toBe('创业慧康');
  });

  it('新接口方法应抛出未实现', async () => {
    const adapter = new ChuangyeHISAdapter();
    await expect(adapter.getAsyncTaskStatus('T1')).rejects.toThrow(/尚未实现/);
  });
});

describe('LianzhongHISAdapter', () => {
  it('应返回联众元信息', () => {
    const adapter = new LianzhongHISAdapter();
    expect(adapter.getMetadata().vendor).toBe('联众智慧');
  });
});

describe('ZhiyeHISAdapter', () => {
  it('应返回智业元信息', () => {
    const adapter = new ZhiyeHISAdapter();
    expect(adapter.getMetadata().vendor).toBe('智业软件');
  });

  it('取消医嘱应抛出未实现', async () => {
    const adapter = new ZhiyeHISAdapter();
    await expect(adapter.cancelOrder('ORD1')).rejects.toThrow(/尚未实现/);
  });
});
