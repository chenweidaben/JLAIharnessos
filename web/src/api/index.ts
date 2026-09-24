/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * web/src/api 统一出口：客户端 / 各领域 API / 对话 WebSocket。
 * 页面统一从 @/api 引入，不再直接散落引用 services。
 */
export * from './client';
export { chatWs, ChatWebSocketClient } from './websocket';
export * as chat from './chat';
export * as patientApi from './patient';
export * as medicalApi from './medical';
