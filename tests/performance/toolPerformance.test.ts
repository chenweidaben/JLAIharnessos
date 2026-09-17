/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 性能测试 - 工具响应时间 / Token预算 / 上下文压缩
 * 说明：开发环境运行，结果仅供参考；阈值为软目标，不阻断CI。
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, emptyCtx } from '../unit/medical-tools/helpers.js';
import { TokenBudgetTracker } from '@/core/context/TokenBudgetTracker';
import { queryPatientTool } from '@/medical-tools/patient/queryPatient.js';
import { getPatientDetailTool } from '@/medical-tools/patient/getPatientDetail.js';
import { getOrderListTool } from '@/medical-tools/order/getOrderList.js';
import { getPrescriptionListTool } from '@/medical-tools/pharmacy/getPrescriptionList.js';

const ctx = makeDoctorContext();

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; result: T }> {
  const start = performance.now();
  const result = await fn();
  return { ms: performance.now() - start, result };
}

describe('性能测试 - 只读医疗工具响应时间（目标 <100ms）', () => {
  it('query_patient 平均响应时间 <100ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { ms } = await timed(() => queryPatientTool.execute({ name: '张' }, ctx));
      times.push(ms);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] query_patient avg=${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(100);
  });

  it('get_patient_detail 平均响应时间 <100ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { ms } = await timed(() => getPatientDetailTool.execute({ patientId: 'P2026090001' }, ctx));
      times.push(ms);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] get_patient_detail avg=${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(100);
  });

  it('get_order_list 平均响应时间 <100ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { ms } = await timed(() => getOrderListTool.execute({ patientId: 'P2026090001' }, emptyCtx));
      times.push(ms);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] get_order_list avg=${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(100);
  });

  it('get_prescription_list 平均响应时间 <100ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { ms } = await timed(() => getPrescriptionListTool.execute({ patientId: 'P2026090003' }, emptyCtx));
      times.push(ms);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] get_prescription_list avg=${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(100);
  });
});

describe('性能测试 - Token预算评估', () => {
  it('单轮 Token 预算评估耗时 <5ms', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 200000 });
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      tracker.addUsage({ input: 1000, output: 200 });
      tracker.evaluateCompaction();
    }
    const ms = performance.now() - start;
    console.log(`[perf] 100轮Token评估耗时=${ms.toFixed(2)}ms, 平均=${(ms / 100).toFixed(3)}ms`);
    expect(ms / 100).toBeLessThan(5);
  });

  it('预算阈值判定稳定', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: 900, output: 0 });
    expect(tracker.evaluateCompaction().level).not.toBe('none');
  });
});

describe('性能测试 - 工具并发', () => {
  it('10个只读查询并发完成总耗时 <500ms', async () => {
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 10 }, () => queryPatientTool.execute({ gender: '男' }, ctx)),
    );
    const ms = performance.now() - start;
    console.log(`[perf] 10并发查询总耗时=${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(500);
  });
});
