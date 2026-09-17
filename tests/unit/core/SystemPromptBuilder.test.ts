/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - SystemPromptBuilder 医疗系统提示词构建器
 */

import { describe, it, expect } from 'bun:test';
import { SystemPromptBuilder } from '@/core/agent/SystemPromptBuilder';
import type { MedicalUser } from '@/types';
import { createMockTool } from './helpers';

function makeUser(overrides: Partial<MedicalUser> = {}): MedicalUser {
  return {
    userId: 'DOC_001',
    name: '陈医生',
    role: 'doctor',
    title: 'attending',
    department: 'cardiology',
    permissions: [],
    loginTime: Date.now(),
    sessionId: 's1',
    ...overrides,
  } as MedicalUser;
}

describe('SystemPromptBuilder', () => {
  const builder = new SystemPromptBuilder();

  it('应恒定包含医疗伦理层与品牌标识', () => {
    const prompt = builder.build({ user: makeUser() });
    expect(prompt).toContain('医疗伦理与安全约束');
    expect(prompt).toContain('健澜科技数智医院智能体');
    expect(prompt).toContain('不得'); // 安全约束
  });

  it('应包含当前操作用户角色与姓名', () => {
    const prompt = builder.build({ user: makeUser({ name: '李医生', role: 'doctor' }) });
    expect(prompt).toContain('李医生');
    expect(prompt).toContain('角色：doctor');
  });

  it('不同角色应注入不同的角色设定', () => {
    const doctorPrompt = builder.build({ user: makeUser({ role: 'doctor' }) });
    const nursePrompt = builder.build({ user: makeUser({ role: 'nurse' }) });
    expect(doctorPrompt).toContain('协助具备执业资格的临床医生');
    expect(nursePrompt).toContain('临床护理人员');
  });

  it('指定科室时应注入科室专业层', () => {
    const prompt = builder.build({ user: makeUser(), department: 'cardiology' });
    expect(prompt).toContain('科室专业提示');
    expect(prompt).toContain('cardiology');
  });

  it('不指定科室时不应出现科室层', () => {
    const prompt = builder.build({ user: makeUser() });
    expect(prompt).not.toContain('科室专业提示');
  });

  it('应按任务类型注入对应任务提示', () => {
    const ward = builder.build({ user: makeUser(), taskType: 'ward_round' });
    expect(ward).toContain('查房');
    const consultation = builder.build({ user: makeUser(), taskType: 'consultation' });
    expect(consultation).toContain('多学科会诊');
  });

  it('传入工具列表时应生成工具使用说明', () => {
    const tool = createMockTool('query_patient');
    const prompt = builder.build({ user: makeUser(), tools: [tool] });
    expect(prompt).toContain('可用工具');
    expect(prompt).toContain('query_patient');
  });

  it('高风险工具应标注人工确认提示', () => {
    const highRiskTool = createMockTool('create_order');
    (highRiskTool as { riskLevel: string }).riskLevel = 'high';
    const prompt = builder.build({ user: makeUser(), tools: [highRiskTool] });
    expect(prompt).toContain('高风险');
  });

  it('额外交代应追加到提示词末尾', () => {
    const prompt = builder.build({ user: makeUser(), extraInstructions: '今日重点关注心梗患者' });
    expect(prompt).toContain('补充说明');
    expect(prompt).toContain('今日重点关注心梗患者');
  });

  it('buildToolDefinitions 应输出 Provider 无关的工具定义', () => {
    const tool = createMockTool('get_lab');
    const defs = builder.buildToolDefinitions([tool]);
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('get_lab');
    expect(defs[0].inputSchema).toBeDefined();
  });

  it('患者角色不应给出具体诊断', () => {
    const prompt = builder.build({ user: makeUser({ role: 'patient' }) });
    expect(prompt).toContain('不得给出具体诊断');
  });
});
