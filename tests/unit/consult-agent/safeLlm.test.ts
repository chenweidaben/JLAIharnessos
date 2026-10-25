/**
 * 单元测试 - 安全降级 LLM（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖分支：
 * - safeLlm.ts 43-45：isAvailable 凭证探测（无凭证 / 任一凭证）
 * - safeLlm.ts 31：supervisor 空 prompt 兜底文案分支
 * - 契约 §9：无凭证走确定性引导文案，不联网、不产生临床结论；
 *   即使检测到凭证，当前阶段仍返回离线确定性模板，degraded 恒为 true。
 */

import { afterEach, describe, expect, it } from 'bun:test';

import { createSafeLlm } from '../../../src/core/agent/consult/llm/safeLlm';
import type { RoleKind } from '../../../src/core/agent/consult/types';

const CREDENTIAL_ENV_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'] as const;

const ORIGINAL_VALUES: Record<string, string | undefined> = {};
for (const key of CREDENTIAL_ENV_KEYS) {
  ORIGINAL_VALUES[key] = process.env[key];
}

afterEach(() => {
  for (const key of CREDENTIAL_ENV_KEYS) {
    const original = ORIGINAL_VALUES[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

function clearCredentials(): void {
  for (const key of CREDENTIAL_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('safeLlm 凭证探测 isAvailable（基线 43-45 行）', () => {
  it('三项凭证均未配置时返回 false', () => {
    clearCredentials();
    expect(createSafeLlm().isAvailable()).toBe(false);
  });

  it('任一项凭证为非空字符串时返回 true；空白字符串视为未配置', () => {
    for (const key of CREDENTIAL_ENV_KEYS) {
      clearCredentials();
      process.env[key] = 'demo-credential';
      expect(createSafeLlm().isAvailable()).toBe(true);
    }

    clearCredentials();
    process.env.OPENAI_API_KEY = '   ';
    expect(createSafeLlm().isAvailable()).toBe(false);
  });
});

describe('safeLlm 降级补全 complete（契约 §9 离线确定性引导）', () => {
  it('无凭证时四角色均返回 degraded=true 的离线确定性文案，不抛异常', async () => {
    clearCredentials();
    const llm = createSafeLlm();
    const roles: RoleKind[] = ['supervisor', 'examiner', 'doctor', 'pharmacist'];

    for (const role of roles) {
      const result = await llm.complete('我最近有点咳嗽', role);
      expect(result.degraded).toBe(true);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.text).toContain('离线确定性引导');
      expect(result.text).toContain('未调用在线模型');
    }
  });

  it('supervisor 空 prompt 走兜底文案，不嵌入主题；非空 prompt 把主题带入引号', async () => {
    clearCredentials();
    const llm = createSafeLlm();

    const emptyResult = await llm.complete('', 'supervisor');
    expect(emptyResult.degraded).toBe(true);
    expect(emptyResult.text).toContain('已接收您的咨询');
    expect(emptyResult.text).not.toContain('“');

    const topicResult = await llm.complete('咳嗽三天了怎么办', 'supervisor');
    expect(topicResult.text).toContain('“咳嗽三天了怎么办”');
  });

  it('即使检测到在线模型凭证，当前阶段仍返回离线确定性模板（不联网）', async () => {
    process.env.OPENAI_API_KEY = 'demo-credential';
    const llm = createSafeLlm();
    expect(llm.isAvailable()).toBe(true);

    const result = await llm.complete('头痛怎么办', 'doctor');
    expect(result.degraded).toBe(true);
    expect(result.text).toContain('离线确定性引导');
    expect(result.text).toContain('未调用在线模型');
  });

  it('确定性输出：同角色同 prompt 两次调用文案逐字一致', async () => {
    clearCredentials();
    const llm = createSafeLlm();
    const first = await llm.complete('我想咨询一下用药', 'pharmacist');
    const second = await llm.complete('我想咨询一下用药', 'pharmacist');
    expect(second.text).toBe(first.text);
    expect(second.degraded).toBe(first.degraded);
  });

  it('医生 / 药师文案仅为复核提示，不含确诊病名、处方剂量等肯定式临床结论', async () => {
    clearCredentials();
    const llm = createSafeLlm();

    const doctor = await llm.complete('头晕乏力', 'doctor');
    expect(doctor.text).toContain('复核');
    expect(doctor.text).not.toContain('确诊：');
    expect(doctor.text).not.toContain('诊断为');
    expect(doctor.text).not.toContain('剂量：');

    const pharmacist = await llm.complete('布洛芬怎么吃', 'pharmacist');
    expect(pharmacist.text).toContain('复核');
    expect(pharmacist.text).not.toContain('处方：');
    expect(pharmacist.text).not.toContain('开具在院医嘱');
  });
});
