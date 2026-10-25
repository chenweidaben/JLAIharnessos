/**
 * 单元测试 - 免责声明常驻校验（契约 §15-2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { createSafeLlm } from '../../../src/core/agent/consult/llm/safeLlm';
import {
  DoctorRole,
  ExaminerRole,
  PharmacistRole,
  SupervisorRole,
} from '../../../src/core/agent/consult/roles';
import { ACUTE_GUIDANCE, DISCLAIMER } from '../../../src/core/agent/consult/types';
import { makeRoleInput } from './helpers';

describe('免责声明常驻', () => {
  it('DISCLAIMER 常量包含 120 急救提示与替代医师面诊声明', () => {
    expect(DISCLAIMER).toContain('120');
    expect(DISCLAIMER).toContain('执业医师');
    expect(DISCLAIMER).toContain('不能替代');
  });

  it('Supervisor 回复末尾常驻免责声明', async () => {
    const output = await new SupervisorRole(createSafeLlm()).handle(
      makeRoleInput({ intent: 'greeting', userText: '你好' }),
    );
    expect(output.reply).toContain(DISCLAIMER);
  });

  it('Examiner 追问回复常驻免责声明', async () => {
    const output = await new ExaminerRole(createSafeLlm()).handle(
      makeRoleInput({ intent: 'symptom_report', userText: '我难受' }),
    );
    expect(output.reply).toContain(DISCLAIMER);
  });

  it('Doctor 回复与诊断草稿正文均常驻免责声明', async () => {
    const output = await new DoctorRole(createSafeLlm()).handle(
      makeRoleInput({ intent: 'symptom_report', userText: '我头痛三天了，有点咳嗽' }),
    );
    expect(output.reply).toContain(DISCLAIMER);
    expect(output.draft?.content).toContain(DISCLAIMER);
  });

  it('Pharmacist 回复与用药草稿正文均常驻免责声明', async () => {
    const output = await new PharmacistRole(createSafeLlm()).handle(
      makeRoleInput({ intent: 'medication_question', userText: '布洛芬怎么吃' }),
    );
    expect(output.reply).toContain(DISCLAIMER);
    expect(output.draft?.content).toContain(DISCLAIMER);
  });

  it('急症引导文案不含确诊结论，仅提示急诊', () => {
    expect(ACUTE_GUIDANCE).toContain('120');
    expect(ACUTE_GUIDANCE).toContain('不构成诊断');
  });
});
