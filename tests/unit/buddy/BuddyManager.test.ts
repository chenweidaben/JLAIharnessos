/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - BuddyManager 子代理管理器
 * 验证：子代理创建 → 任务执行 → 池化复用 → 超时处理 → 失败重试。
 */

import { describe, it, expect } from 'bun:test';
import { BuddyManager } from '@/core/buddy/BuddyManager';
import { SPECIALTY_CONFIGS } from '@/core/buddy/specialties';
import type {
  LLMClient,
  LLMRequest,
  LLMResponse,
  BuddyTask,
} from '@/core/buddy/types';

/** Mock LLM 客户端：可配置延迟与输出 */
class MockLLMClient implements LLMClient {
  public requests: LLMRequest[] = [];
  constructor(
    private readonly options: {
      delayMs?: number;
      output?: string;
      fail?: boolean;
    } = {},
  ) {}

  async complete(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    this.requests.push(req);
    if (this.options.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.options.delayMs);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'));
        });
      });
    }
    if (this.options.fail) throw new Error('LLM 故障');
    return {
      output: this.options.output ?? '子代理分析完成',
      model: req.model ?? 'sonnet',
      turns: 2,
      toolCalls: ['get_lab_result'],
      confidence: 0.88,
      tokens: 120,
      truncated: false,
    };
  }
}

function makeTask(agentType: string, id: string): BuddyTask {
  return {
    taskId: id,
    agentType,
    instruction: '分析本病例',
    patientId: 'P001',
    encounterId: 'E001',
    priority: 'normal',
    traceId: `trace_${id}`,
  };
}

describe('BuddyManager 子代理生命周期', () => {
  it('应创建子代理并成功执行任务', async () => {
    const llm = new MockLLMClient({ output: '内科鉴别诊断：考虑冠心病' });
    const mgr = new BuddyManager(llm, SPECIALTY_CONFIGS, { maxRetries: 0 });
    const res = await mgr.dispatch(makeTask('internal-medicine', 't1'), {
      patientId: 'P001',
      age: 60,
      gender: 'male',
    });
    expect(res.status).toBe('completed');
    expect(res.summary).toContain('内科');
    expect(res.toolsUsed).toContain('get_lab_result');
    expect(llm.requests[0].allowedTools).toContain('get_lab_result');
  });

  it('多次派发同科室任务应池化复用实例', async () => {
    const llm = new MockLLMClient();
    const mgr = new BuddyManager(llm, SPECIALTY_CONFIGS, {
      maxIdlePerType: 3,
      maxRetries: 0,
    });
    await mgr.dispatch(makeTask('pediatrics', 'p1'));
    await mgr.dispatch(makeTask('pediatrics', 'p2'));
    // 任务完成后实例应回收到池中
    expect(mgr.idleCount).toBeGreaterThanOrEqual(1);
    const snap = mgr.listSnapshots().find((s) => s.agentType === 'pediatrics');
    expect(snap).toBeDefined();
  });

  it('急诊任务超时应返回 timeout 状态', async () => {
    // emergency 配置超时 30s，这里让 LLM 延迟 400ms（测试环境用小延迟模拟）
    const llm = new MockLLMClient({ delayMs: 500 });
    // 直接用一个极短超时的自定义配置覆盖
    const fastConfig = new Map(SPECIALTY_CONFIGS);
    const emergency = fastConfig.get('emergency')!;
    fastConfig.set('emergency', { ...emergency, timeoutMs: 50 });

    const mgr = new BuddyManager(llm, fastConfig, { maxRetries: 0 });
    const res = await mgr.dispatch(makeTask('emergency', 'e1'));
    expect(res.status).toBe('timeout');
    expect(res.error).toBeDefined();
  });

  it('LLM 失败时应按配置重试', async () => {
    const llm = new MockLLMClient({ fail: true });
    const mgr = new BuddyManager(llm, SPECIALTY_CONFIGS, { maxRetries: 2 });
    const res = await mgr.dispatch(makeTask('icu', 'i1'));
    expect(res.status).toBe('failed');
    // 初始 1 次 + 重试 2 次 = 3 次调用
    expect(llm.requests.length).toBe(3);
  });

  it('未注册科室应返回配置错误', async () => {
    const llm = new MockLLMClient();
    const mgr = new BuddyManager(llm, SPECIALTY_CONFIGS, { maxRetries: 0 });
    const res = await mgr.dispatch(makeTask('nonexistent', 'x1'));
    expect(res.status).toBe('failed');
    expect(res.error).toContain('CONFIG_NOT_FOUND');
  });

  it('应监控子代理运行状态', async () => {
    const llm = new MockLLMClient();
    const mgr = new BuddyManager(llm, SPECIALTY_CONFIGS, { maxRetries: 0 });
    await mgr.dispatch(makeTask('icu', 'm1'));
    const snaps = mgr.listSnapshots();
    expect(snaps.length).toBeGreaterThan(0);
    expect(snaps[0].completedTasks).toBe(1);
  });

  it('急诊科室配置应为 30s 超时', () => {
    const emergency = SPECIALTY_CONFIGS.get('emergency');
    expect(emergency?.timeoutMs).toBe(30_000);
    expect(emergency?.emergencyOverride).toBe(true);
  });
});
