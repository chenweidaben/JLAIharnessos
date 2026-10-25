/**
 * consult-agent M86 单元测试辅助夹具
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 仅用于本分片单元测试：构造线程 / 消息 / 画像 / 编排上下文；
 * DEMO_MODE=1，进程内运行时短路，不连库、不联网。
 */

import type { OrchestratorContext } from '../../../src/core/agent/consult/consultOrchestrator';
import { createSafeLlm } from '../../../src/core/agent/consult/llm/safeLlm';
import { createProfileMemory } from '../../../src/core/agent/consult/memory/profileMemory';
import type { RoleInput } from '../../../src/core/agent/consult/ports';
import { newId, nowIso } from '../../../src/core/agent/consult/roleSupport';
import type { SessionRuntime } from '../../../src/core/agent/consult/runtime/sessionRuntime';
import { createDefaultToolRegistry } from '../../../src/core/agent/consult/tools/toolRegistry';
import type { ConsultMessage, ConsultThread } from '../../../src/core/agent/consult/types';
import { DISCLAIMER } from '../../../src/core/agent/consult/types';

export const TEST_USER_ID = 'u-test-001';
export const TEST_TRACE_ID = 'trace-test-m86';

/** 构造测试线程（默认 idle 初始态） */
export function makeThread(overrides: Partial<ConsultThread> = {}): ConsultThread {
  const now = nowIso();
  return {
    id: newId('thread'),
    userId: TEST_USER_ID,
    patientId: null,
    title: '在线咨询会话（测试）',
    status: 'idle',
    intent: 'unknown',
    safetyLevel: 'normal',
    currentRole: null,
    meta: {},
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** 构造测试消息 */
export function makeMessage(overrides: Partial<ConsultMessage> = {}): ConsultMessage {
  return {
    id: newId('msg'),
    threadId: 'thread-test',
    role: 'user',
    content: '',
    intent: null,
    roleKind: null,
    toolCalls: null,
    toolName: null,
    safetyLevel: 'normal',
    disclaimer: DISCLAIMER,
    traceId: TEST_TRACE_ID,
    createdAt: nowIso(),
    ...overrides,
  };
}

/** 构造角色处理入参夹具 */
export function makeRoleInput(overrides: Partial<RoleInput> = {}): RoleInput {
  return {
    thread: makeThread(),
    history: [],
    userText: '',
    intent: 'unknown',
    tools: createDefaultToolRegistry(),
    profile: createProfileMemory(TEST_USER_ID),
    traceId: TEST_TRACE_ID,
    ...overrides,
  };
}

/** 基于进程内运行时构造编排上下文 */
export async function makeOrchestratorContext(
  runtime: SessionRuntime,
  overrides: Partial<OrchestratorContext> = {},
): Promise<OrchestratorContext> {
  const profile = await runtime.getProfile(TEST_USER_ID);
  return {
    userId: TEST_USER_ID,
    traceId: TEST_TRACE_ID,
    repo: runtime,
    llm: createSafeLlm(),
    tools: createDefaultToolRegistry(),
    profile,
    ...overrides,
  };
}
