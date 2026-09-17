/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统管理模块 - 状态管理（Zustand）
 * 覆盖：系统配置、字典、机构、知识库、CDS规则、工具、Agent、集成、消息通知、系统监控
 */
import { create } from 'zustand';
import type {
  SystemConfig,
  DictItem,
  DictCategory,
  Organization,
  Department,
  Ward,
  KnowledgeDocument,
  KnowledgeCategory,
  KnowledgeBase,
  KnowledgeVersion,
  SearchResult,
  CDSRule,
  CDSTestResult,
  ToolConfig,
  ToolStat,
  ToolCallLog,
  AgentConfig,
  AgentStat,
  AgentSessionLog,
  IntegrationConfig,
  IntegrationLog,
  NotificationTemplate,
  PushRule,
  NotificationRecord,
  MonitorData,
  MessageTopic,
} from '@/types/system';
import {
  mockSystemConfig,
  mockDictCategories,
  mockDictItems,
  mockOrganization,
  mockDepartments,
  mockWards,
  mockKnowledgeCategories,
  mockKnowledgeBases,
  mockKnowledgeDocuments,
  mockKnowledgeVersions,
  mockSearchResults,
  mockCDSRules,
  mockCDSTestResult,
  mockTools,
  mockToolStats,
  mockToolCallLogs,
  mockAgents,
  mockAgentStats,
  mockAgentSessionLogs,
  mockIntegrations,
  mockIntegrationLogs,
  mockMessageTopics,
  mockNotificationTemplates,
  mockPushRules,
  mockNotificationRecords,
  mockMonitorData,
} from '@/mock/systemMock';
import { delay } from '@/mock/utils';

/* ============================== State 接口 ============================== */

interface SystemState {
  // 数据
  systemConfig: SystemConfig;
  dictCategories: DictCategory[];
  dictItems: Record<string, DictItem[]>;
  organization: Organization;
  departments: Department[];
  wards: Ward[];
  knowledgeCategories: KnowledgeCategory[];
  knowledgeList: KnowledgeBase[];
  knowledgeDocuments: KnowledgeDocument[];
  knowledgeVersions: KnowledgeVersion[];
  cdsRules: CDSRule[];
  toolList: ToolConfig[];
  toolStats: ToolStat[];
  toolCallLogs: ToolCallLog[];
  agentList: AgentConfig[];
  agentStats: AgentStat[];
  agentSessionLogs: AgentSessionLog[];
  integrationConfig: IntegrationConfig[];
  integrationLogs: IntegrationLog[];
  messageTopics: MessageTopic[];
  notificationTemplates: NotificationTemplate[];
  pushRules: PushRule[];
  notificationRecords: NotificationRecord[];
  monitorData: MonitorData;
  // 检索测试结果
  searchResults: SearchResult[];
  loading: boolean;
}

interface SystemActions {
  // 系统配置
  fetchSystemConfig: () => Promise<void>;
  updateSystemConfig: (config: Partial<SystemConfig>) => Promise<void>;
  // 字典
  fetchDict: () => Promise<void>;
  updateDict: (categoryCode: string, items: DictItem[]) => Promise<void>;
  addDictItem: (categoryCode: string, item: DictItem) => Promise<void>;
  deleteDictItem: (categoryCode: string, itemId: string) => Promise<void>;
  // 机构
  fetchOrganization: () => Promise<void>;
  updateOrganization: (org: Partial<Organization>) => Promise<void>;
  fetchDepartments: () => Promise<void>;
  updateDepartment: (dept: Department) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<void>;
  fetchWards: () => Promise<void>;
  // 知识库
  fetchKnowledge: () => Promise<void>;
  uploadKnowledge: (doc: Partial<KnowledgeDocument>) => Promise<void>;
  publishKnowledge: (docId: string) => Promise<void>;
  archiveKnowledge: (docId: string) => Promise<void>;
  revectorize: (docId: string) => Promise<void>;
  searchKnowledge: (query: string, topK: number, threshold: number) => Promise<SearchResult[]>;
  fetchKnowledgeVersions: () => Promise<void>;
  rollbackVersion: (version: string) => Promise<void>;
  // CDS 规则
  fetchCDSRules: () => Promise<void>;
  updateCDSRule: (rule: CDSRule) => Promise<void>;
  toggleCDSRule: (ruleId: string) => Promise<void>;
  testCDSRule: (ruleId: string) => Promise<CDSTestResult>;
  // 工具
  fetchTools: () => Promise<void>;
  updateToolConfig: (tool: ToolConfig) => Promise<void>;
  toggleToolStatus: (toolId: string) => Promise<void>;
  testTool: (
    toolCode: string,
    params: Record<string, unknown>,
  ) => Promise<{ success: boolean; data: unknown }>;
  fetchToolCallLogs: () => Promise<void>;
  // Agent
  fetchAgents: () => Promise<void>;
  updateAgentConfig: (agent: AgentConfig) => Promise<void>;
  toggleAgentStatus: (agentId: string) => Promise<void>;
  testAgent: (agentId: string, message: string) => Promise<{ reply: string; tokens: number }>;
  fetchAgentLogs: () => Promise<void>;
  // 集成
  fetchIntegrationConfig: () => Promise<void>;
  updateIntegration: (ig: IntegrationConfig) => Promise<void>;
  testIntegration: (
    igId: string,
  ) => Promise<{ success: boolean; latencyMs: number; message: string }>;
  fetchIntegrationLogs: () => Promise<void>;
  // 通知
  fetchNotificationTemplates: () => Promise<void>;
  updateNotificationTemplate: (tpl: NotificationTemplate) => Promise<void>;
  fetchPushRules: () => Promise<void>;
  updatePushRule: (rule: PushRule) => Promise<void>;
  fetchNotificationRecords: () => Promise<void>;
  // 监控
  fetchMonitorData: () => Promise<void>;
}

export type SystemStore = SystemState & SystemActions;

export const useSystemStore = create<SystemStore>((set, get) => ({
  /* ---------- 初始数据 ---------- */
  systemConfig: mockSystemConfig,
  dictCategories: mockDictCategories,
  dictItems: mockDictItems,
  organization: mockOrganization,
  departments: mockDepartments,
  wards: mockWards,
  knowledgeCategories: mockKnowledgeCategories,
  knowledgeList: mockKnowledgeBases,
  knowledgeDocuments: mockKnowledgeDocuments,
  knowledgeVersions: mockKnowledgeVersions,
  cdsRules: mockCDSRules,
  toolList: mockTools,
  toolStats: mockToolStats,
  toolCallLogs: mockToolCallLogs,
  agentList: mockAgents,
  agentStats: mockAgentStats,
  agentSessionLogs: mockAgentSessionLogs,
  integrationConfig: mockIntegrations,
  integrationLogs: mockIntegrationLogs,
  messageTopics: mockMessageTopics,
  notificationTemplates: mockNotificationTemplates,
  pushRules: mockPushRules,
  notificationRecords: mockNotificationRecords,
  monitorData: mockMonitorData,
  searchResults: [],
  loading: false,

  /* ---------- 系统配置 ---------- */
  fetchSystemConfig: async () => {
    set({ loading: true });
    await delay();
    set({ systemConfig: mockSystemConfig, loading: false });
  },
  updateSystemConfig: async (config) => {
    await delay(200);
    set({ systemConfig: { ...get().systemConfig, ...config } });
  },

  /* ---------- 字典 ---------- */
  fetchDict: async () => {
    await delay();
    set({ dictCategories: mockDictCategories, dictItems: mockDictItems });
  },
  updateDict: async (categoryCode, items) => {
    await delay(150);
    set({ dictItems: { ...get().dictItems, [categoryCode]: items } });
  },
  addDictItem: async (categoryCode, item) => {
    await delay(100);
    const current = get().dictItems[categoryCode] ?? [];
    set({ dictItems: { ...get().dictItems, [categoryCode]: [...current, item] } });
  },
  deleteDictItem: async (categoryCode, itemId) => {
    await delay(100);
    const current = get().dictItems[categoryCode] ?? [];
    set({
      dictItems: { ...get().dictItems, [categoryCode]: current.filter((i) => i.id !== itemId) },
    });
  },

  /* ---------- 机构 ---------- */
  fetchOrganization: async () => {
    await delay();
    set({ organization: mockOrganization });
  },
  updateOrganization: async (org) => {
    await delay(200);
    set({ organization: { ...get().organization, ...org } });
  },
  fetchDepartments: async () => {
    await delay();
    set({ departments: mockDepartments });
  },
  updateDepartment: async (dept) => {
    await delay(150);
    const exists = get().departments.some((d) => d.id === dept.id);
    set({
      departments: exists
        ? get().departments.map((d) => (d.id === dept.id ? dept : d))
        : [...get().departments, dept],
    });
  },
  deleteDepartment: async (deptId) => {
    await delay(100);
    set({ departments: get().departments.filter((d) => d.id !== deptId) });
  },
  fetchWards: async () => {
    await delay();
    set({ wards: mockWards });
  },

  /* ---------- 知识库 ---------- */
  fetchKnowledge: async () => {
    set({ loading: true });
    await delay();
    set({
      knowledgeCategories: mockKnowledgeCategories,
      knowledgeList: mockKnowledgeBases,
      knowledgeDocuments: mockKnowledgeDocuments,
      loading: false,
    });
  },
  uploadKnowledge: async (doc) => {
    await delay(300);
    const newDoc: KnowledgeDocument = {
      id: doc.id ?? `doc_${Date.now()}`,
      title: doc.title ?? '未命名文档',
      categoryId: doc.categoryId ?? 'kc1',
      tags: doc.tags ?? [],
      wordCount: doc.wordCount ?? 0,
      chunkCount: 0,
      source: doc.source ?? '文献',
      format: doc.format ?? 'PDF',
      version: 'v1.0.0',
      status: 'draft',
      vectorStatus: 'pending',
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: '当前用户',
      content: doc.content,
    };
    set({ knowledgeDocuments: [newDoc, ...get().knowledgeDocuments] });
  },
  publishKnowledge: async (docId) => {
    await delay(150);
    set({
      knowledgeDocuments: get().knowledgeDocuments.map((d) =>
        d.id === docId ? { ...d, status: 'published' as const } : d,
      ),
    });
  },
  archiveKnowledge: async (docId) => {
    await delay(150);
    set({
      knowledgeDocuments: get().knowledgeDocuments.map((d) =>
        d.id === docId ? { ...d, status: 'archived' as const } : d,
      ),
    });
  },
  revectorize: async (docId) => {
    await delay(400);
    set({
      knowledgeDocuments: get().knowledgeDocuments.map((d) =>
        d.id === docId ? { ...d, vectorStatus: 'processing' as const } : d,
      ),
    });
    setTimeout(() => {
      set({
        knowledgeDocuments: get().knowledgeDocuments.map((d) =>
          d.id === docId
            ? {
                ...d,
                vectorStatus: 'done' as const,
                chunkCount: Math.floor(Math.random() * 50) + 10,
              }
            : d,
        ),
      });
    }, 2000);
  },
  searchKnowledge: async (_query, _topK, _threshold) => {
    await delay(500);
    set({ searchResults: mockSearchResults });
    return mockSearchResults;
  },
  fetchKnowledgeVersions: async () => {
    await delay();
    set({ knowledgeVersions: mockKnowledgeVersions });
  },
  rollbackVersion: async (version) => {
    await delay(300);
    // 演示环境：版本回滚仅模拟耗时，不实际变更数据
    void version;
  },

  /* ---------- CDS 规则 ---------- */
  fetchCDSRules: async () => {
    await delay();
    set({ cdsRules: mockCDSRules });
  },
  updateCDSRule: async (rule) => {
    await delay(200);
    const exists = get().cdsRules.some((r) => r.id === rule.id);
    set({
      cdsRules: exists
        ? get().cdsRules.map((r) => (r.id === rule.id ? rule : r))
        : [...get().cdsRules, rule],
    });
  },
  toggleCDSRule: async (ruleId) => {
    await delay(100);
    set({
      cdsRules: get().cdsRules.map((r) =>
        r.id === ruleId ? { ...r, status: r.status === 'enabled' ? 'disabled' : 'enabled' } : r,
      ),
    });
  },
  testCDSRule: async (_ruleId) => {
    await delay(500);
    return mockCDSTestResult;
  },

  /* ---------- 工具 ---------- */
  fetchTools: async () => {
    await delay();
    set({ toolList: mockTools, toolStats: mockToolStats });
  },
  updateToolConfig: async (tool) => {
    await delay(200);
    set({
      toolList: get().toolList.map((t) => (t.id === tool.id ? tool : t)),
    });
  },
  toggleToolStatus: async (toolId) => {
    await delay(100);
    set({
      toolList: get().toolList.map((t) =>
        t.id === toolId ? { ...t, status: t.status === 'enabled' ? 'disabled' : 'enabled' } : t,
      ),
    });
  },
  testTool: async (_toolCode, _params) => {
    await delay(800);
    return {
      success: true,
      data: { message: '工具调用成功（Mock）', timestamp: new Date().toISOString() },
    };
  },
  fetchToolCallLogs: async () => {
    await delay();
    set({ toolCallLogs: mockToolCallLogs });
  },

  /* ---------- Agent ---------- */
  fetchAgents: async () => {
    await delay();
    set({ agentList: mockAgents, agentStats: mockAgentStats });
  },
  updateAgentConfig: async (agent) => {
    await delay(200);
    set({
      agentList: get().agentList.map((a) => (a.id === agent.id ? agent : a)),
    });
  },
  toggleAgentStatus: async (agentId) => {
    await delay(100);
    set({
      agentList: get().agentList.map((a) =>
        a.id === agentId ? { ...a, status: a.status === 'online' ? 'offline' : 'online' } : a,
      ),
    });
  },
  testAgent: async (_agentId, _message) => {
    await delay(1200);
    return {
      reply:
        '根据您提供的患者信息，建议进一步检查心肌酶谱和心脏彩超，以明确诊断。同时需注意患者的血压和心率变化。',
      tokens: 512,
    };
  },
  fetchAgentLogs: async () => {
    await delay();
    set({ agentSessionLogs: mockAgentSessionLogs });
  },

  /* ---------- 集成 ---------- */
  fetchIntegrationConfig: async () => {
    await delay();
    set({ integrationConfig: mockIntegrations, messageTopics: mockMessageTopics });
  },
  updateIntegration: async (ig) => {
    await delay(200);
    set({
      integrationConfig: get().integrationConfig.map((i) => (i.id === ig.id ? ig : i)),
    });
  },
  testIntegration: async (igId) => {
    await delay(1000);
    const ig = get().integrationConfig.find((i) => i.id === igId);
    const connected = ig?.status === 'connected';
    return {
      success: connected,
      latencyMs: connected ? 45 + Math.floor(Math.random() * 50) : 5000,
      message: connected ? '连接成功，认证通过，接口可用' : '连接超时，请检查Endpoint和网络配置',
    };
  },
  fetchIntegrationLogs: async () => {
    await delay();
    set({ integrationLogs: mockIntegrationLogs });
  },

  /* ---------- 通知 ---------- */
  fetchNotificationTemplates: async () => {
    await delay();
    set({ notificationTemplates: mockNotificationTemplates });
  },
  updateNotificationTemplate: async (tpl) => {
    await delay(200);
    set({
      notificationTemplates: get().notificationTemplates.map((t) => (t.id === tpl.id ? tpl : t)),
    });
  },
  fetchPushRules: async () => {
    await delay();
    set({ pushRules: mockPushRules });
  },
  updatePushRule: async (rule) => {
    await delay(200);
    set({
      pushRules: get().pushRules.map((r) => (r.id === rule.id ? rule : r)),
    });
  },
  fetchNotificationRecords: async () => {
    await delay();
    set({ notificationRecords: mockNotificationRecords });
  },

  /* ---------- 监控 ---------- */
  fetchMonitorData: async () => {
    set({ loading: true });
    await delay(300);
    set({ monitorData: mockMonitorData, loading: false });
  },
}));
