/** 健澜科技：P2 AgentFramework 资源 Agent 化（M86-K）。DEMO_MODE 下内存 Agent 与调用记录。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 临床资源类型 */
type ResourceType = 'order' | 'emr' | 'lab' | 'patient360';
type AgentStatus = 'ready' | 'busy' | 'error';

/** 资源 Agent 清单条目 */
interface ResourceAgent {
  agentId: string;
  resourceType: ResourceType;
  name: string;
  description: string;
  status: AgentStatus;
  tools: string[];
}

/** 一次 Agent 调用任务记录（脱敏演示） */
interface AgentTaskRecord {
  requestId: string;
  agentId: string;
  resourceType: ResourceType;
  inputSummary: string;
  outputSummary: string;
  latencyMs: number;
  status: 'success' | 'failed' | 'running';
  createdAt: string;
}

/** DEMO 内存资源 Agent 注册表（4 个临床资源 Agent） */
const demoAgents: ResourceAgent[] = [
  {
    agentId: 'order-agent',
    resourceType: 'order',
    name: '医嘱资源 Agent',
    description: '对外暴露医嘱开立/审核/执行跟踪能力，可被编排链调用完成处方与医嘱闭环。',
    status: 'ready',
    tools: ['order.create', 'order.review', 'order.track', 'order.cancel'],
  },
  {
    agentId: 'emr-agent',
    resourceType: 'emr',
    name: '病历资源 Agent',
    description: '对外暴露病历检索、结构化抽取与书写辅助能力，支撑病历主数据访问。',
    status: 'ready',
    tools: ['emr.search', 'emr.extract', 'emr.draft', 'emr.qc'],
  },
  {
    agentId: 'lab-agent',
    resourceType: 'lab',
    name: '检验检查资源 Agent',
    description: '对外暴露检验/检查申请与结果回读、危急值拦截能力，串联 LIS/PACS。',
    status: 'busy',
    tools: ['lab.apply', 'lab.result', 'lab.criticalValue', 'exam.apply'],
  },
  {
    agentId: 'patient360-agent',
    resourceType: 'patient360',
    name: '患者 360 资源 Agent',
    description: '对外暴露患者全景画像：基本信息、就诊史、用药与检验趋势聚合视图。',
    status: 'ready',
    tools: ['patient.profile', 'patient.timeline', 'patient.overview'],
  },
];

/** DEMO 预置调用历史（脱敏：张某某/李某某/王某某） */
const taskHistory: AgentTaskRecord[] = [
  {
    requestId: 'req-20261103-0001',
    agentId: 'order-agent',
    resourceType: 'order',
    inputSummary: '为患者 张** 开立：阿莫西林胶囊 0.25g tid×3d',
    outputSummary: '已受理医嘱开立请求，进入药师审核队列',
    latencyMs: 186,
    status: 'success',
    createdAt: '2026-11-03T09:12:40+08:00',
  },
  {
    requestId: 'req-20261103-0002',
    agentId: 'emr-agent',
    resourceType: 'emr',
    inputSummary: '抽取患者 李** 门诊病历主诉与现病史实体',
    outputSummary: '抽取主诉 3 项、现病史实体 11 个，结构化写入病历时间线',
    latencyMs: 432,
    status: 'success',
    createdAt: '2026-11-03T10:05:18+08:00',
  },
  {
    requestId: 'req-20261103-0003',
    agentId: 'lab',
    resourceType: 'lab',
    inputSummary: '为患者 王** 申请：血常规+C反应蛋白',
    outputSummary: '申请已下发至 LIS，标本待采集（危急值规则已挂载）',
    latencyMs: 97,
    status: 'success',
    createdAt: '2026-11-03T11:48:02+08:00',
  },
  {
    requestId: 'req-20261103-0004',
    agentId: 'patient360-agent',
    resourceType: 'patient360',
    inputSummary: '聚合患者 张** 近一年就诊与用药趋势视图',
    outputSummary: '聚合就诊 6 次、在用药 4 种、检验趋势 12 项，返回全景画像',
    latencyMs: 654,
    status: 'success',
    createdAt: '2026-11-03T14:22:55+08:00',
  },
  {
    requestId: 'req-20261103-0005',
    agentId: 'emr-agent',
    resourceType: 'emr',
    inputSummary: '为患者 李** 生成入院记录初稿（OCR 转录异常）',
    outputSummary: '病历 OCR 字段缺失，已转人工补录，调用未完成',
    latencyMs: 1230,
    status: 'failed',
    createdAt: '2026-11-03T16:03:31+08:00',
  },
];

/** 按 agentId 查找资源 Agent */
function findAgent(agentId: string): ResourceAgent | undefined {
  return demoAgents.find((a) => a.agentId === agentId);
}

/** 生成新的 requestId */
function newRequestId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `req-${ymd}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

/** 为不同资源 Agent 生成脱敏演示结果 */
function buildDemoResult(agent: ResourceAgent, input: string): string {
  const safeInput = (input || '').slice(0, 40) || '（空输入）';
  switch (agent.resourceType) {
    case 'order':
      return `已受理医嘱开立请求：${safeInput}。已校验用法用量与过敏史，进入药师审核。`;
    case 'emr':
      return `病历资源已返回：围绕「${safeInput}」完成结构化抽取，关键实体已写入病历时间线。`;
    case 'lab':
      return `检验检查申请已受理：${safeInput}。标本采集流程已下发，危急值规则实时挂载。`;
    case 'patient360':
      return `患者 360 画像已聚合：围绕「${safeInput}」返回基本信息、就诊史与用药检验趋势视图。`;
    default:
      return `资源 Agent 已受理：${safeInput}`;
  }
}

export const agentResourcesRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/agent-resources',
    auth: true,
    handle: async (): Promise<Response> => {
      if (!isDemo) return json({ items: [] });
      return json({ items: demoAgents });
    },
  },
  {
    method: 'POST',
    path: '/api/v1/agent-resources/:agentId/invoke',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const agentId = c.params.agentId;
      const agent = findAgent(agentId);
      if (!agent) {
        return json({ error: 'not_found', message: `资源 Agent 不存在：${agentId}` }, 404);
      }
      let body: { input?: unknown; params?: unknown } = {};
      try {
        body = c.body ? await c.body() : {};
      } catch {
        return json({ error: 'bad_request', message: '请求体不是合法 JSON' }, 400);
      }
      const input = typeof body.input === 'string' ? body.input : '';

      if (!isDemo) {
        return json({ error: 'unavailable', message: '非 DEMO_MODE：资源 Agent 编排适配器待接入' }, 503);
      }

      const start = Date.now();
      const result = buildDemoResult(agent, input);
      const latencyMs = Date.now() - start + 40 + Math.floor(Math.random() * 120);
      const requestId = newRequestId();

      const record: AgentTaskRecord = {
        requestId,
        agentId,
        resourceType: agent.resourceType,
        inputSummary: (input || '（空输入）').slice(0, 60),
        outputSummary: result.slice(0, 80),
        latencyMs,
        status: 'success',
        createdAt: new Date().toISOString(),
      };
      taskHistory.unshift(record);

      return json({
        agentId,
        requestId,
        result,
        latencyMs,
        status: 'success',
      });
    },
  },
  {
    method: 'GET',
    path: '/api/v1/agent-resources/:agentId/tasks',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const agentId = c.params.agentId;
      const agent = findAgent(agentId);
      if (!agent) {
        return json({ error: 'not_found', message: `资源 Agent 不存在：${agentId}` }, 404);
      }
      if (!isDemo) return json({ items: [] });
      const items = taskHistory.filter((t) => t.agentId === agentId);
      return json({ items });
    },
  },
];
