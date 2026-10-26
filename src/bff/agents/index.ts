/**
 * 健澜AI原生医院操作系统OS - bff/agents/index.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 模型管理子系统模块统一出口：模型注册表、健康探针、策略路由、智能体准入门禁（S-02 / S-03 / S-06）。
 *
 * 注意：本桶文件仅聚合本切片新增模块，不改动既有 agentRegistry / toolRegistry /
 * modelProvider 的调用面；既有符号继续由各自模块直接导出。
 *
 * @module bff/agents
 */

export * from './modelRegistry.js';
export * from './modelHealthProbe.js';
export * from './modelRouter.js';
export * from './agentAdmission.js';
export * from './outpatient/index.js';
export * from './shared/index.js';
export * from './inpatient/index.js';
