/**
 * 健澜科技杠OS - 引用解析器工厂
 *
 * 将工作流校验所需的"工具/知识库/子智能体是否存在"三类查询，
 * 绑定到运行时服务与智能体注册中心，生成 validator 使用的 ReferenceResolver。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { ReferenceResolver } from './validator.js';
import type { IRagRetriever, IToolInvoker } from './runtime.js';
import type { AgentRegistry } from '../agent/AgentRegistry.js';

/** 由运行时服务与注册中心构造引用解析器 */
export function createReferenceResolver(deps: {
  tools: IToolInvoker;
  rag: IRagRetriever;
  agents: AgentRegistry;
}): ReferenceResolver {
  return {
    hasTool: (name) => deps.tools.has(name),
    hasKnowledgeBase: (name) => deps.rag.hasKnowledgeBase(name),
    hasAgent: (id) => deps.agents.has(id),
  };
}
