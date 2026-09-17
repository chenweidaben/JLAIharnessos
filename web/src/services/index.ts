/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * services 统一导出
 */
export { default as request, setupRequestHandlers, get, post, put, del } from './request';
export { wsClient } from './websocket';
export * as authApi from './api/auth';
export * as patientApi from './api/patient';
export * as chatApi from './api/chat';
