/**
 * 健澜科技数智医院智能体 - integration/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 系统集成模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 系统集成模块提供：
 * - 适配器框架（BaseAdapter、配置、注册中心、错误定义）
 * - HIS/EMR/LIS/PACS适配器接口及Mock实现
 * - HL7 v2.x消息处理（解析、构建、消息类型定义）
 * - 集成中间件（消息总线、事件类型、字段映射器）
 *
 * @module integration
 */

// 类型
export * from './types';

// 适配器
export * from './adapters';

// 协议转换
export * from './protocols';

// 中间件
export * from './middleware';

// 集成监控
export * from './monitoring';
