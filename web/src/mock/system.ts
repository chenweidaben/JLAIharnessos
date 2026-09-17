/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统管理 Mock
 */
export const mockSystemConfig = {
  siteName: '健澜科技数智医院智能体',
  version: '0.1.0',
  enableDesensitization: true,
  enableCds: true,
  enableStreaming: true,
  llmModel: 'jianlan-medical-7b',
};

export const mockTools = [
  {
    name: 'query_patient',
    label: '患者查询',
    risk: 'low' as const,
    enabled: true,
    requireConfirm: false,
  },
  {
    name: 'create_order',
    label: '开立医嘱',
    risk: 'high' as const,
    enabled: true,
    requireConfirm: true,
  },
  {
    name: 'create_prescription',
    label: '开具处方',
    risk: 'high' as const,
    enabled: true,
    requireConfirm: true,
  },
];

export const mockAgents = [
  {
    id: 'ag_internal',
    name: '内科子代理',
    specialty: 'internal-medicine',
    enabled: true,
    model: 'jianlan-medical-7b',
  },
  {
    id: 'ag_surgery',
    name: '外科子代理',
    specialty: 'surgery',
    enabled: true,
    model: 'jianlan-medical-7b',
  },
  {
    id: 'ag_emergency',
    name: '急诊子代理',
    specialty: 'emergency',
    enabled: true,
    model: 'jianlan-medical-7b',
  },
];

export const mockIntegrations = [
  { id: 'ig_his', system: 'HIS', enabled: true, endpoint: 'http://his.internal:8080' },
  { id: 'ig_emr', system: 'EMR', enabled: true, endpoint: 'http://emr.internal:8081' },
  { id: 'ig_lis', system: 'LIS', enabled: true, endpoint: 'http://lis.internal:8082' },
  { id: 'ig_pacs', system: 'PACS', enabled: false, endpoint: 'http://pacs.internal:8083' },
];

export const mockSystemMonitor = {
  cpuUsage: 23.5,
  memoryUsage: 61.2,
  diskUsage: 48.0,
  activeSessions: 128,
  uptimeSeconds: 86400,
};
export const mockPerformance = {
  apiP50Ms: 42,
  apiP95Ms: 180,
  rps: 12.6,
  errorRate: 0.003,
  llmAvgMs: 1450,
};
export const mockHealth = { status: 'healthy' as const, version: '0.1.0', uptimeSeconds: 86400 };
