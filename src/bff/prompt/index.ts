/**
 * 健澜AI原生医院操作系统OS - bff/prompt/index.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 提示词治理子系统模块统一出口：资产台账、Schema 守卫、指标聚合、加载链（S-04）。
 *
 * 注意：本桶文件仅聚合本切片新增模块，不改动既有路由与聚合器调用面。
 *
 * @module bff/prompt
 */

export * from './assetRegistry.js';
export * from './schemaGuard.js';
export * from './metricsAggregator.js';
export * from './promptLoader.js';
