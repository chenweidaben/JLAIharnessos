/**
 * 健澜AI原生医院操作系统OS - bff/agents/index.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * S-02 模型管理子系统模块统一出口：模型注册表与健康探针。
 *
 * 注意：本桶文件仅聚合 S-02 新增模块，不改动既有 agentRegistry / toolRegistry /
 * modelProvider 的调用面；既有符号继续由各自模块直接导出。
 *
 * @module bff/agents
 */

export * from './modelRegistry.js';
export * from './modelHealthProbe.js';
