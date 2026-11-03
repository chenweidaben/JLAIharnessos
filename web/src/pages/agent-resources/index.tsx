/** 健澜科技：P2 AgentFramework 资源 Agent 化（M86-K）。资源 Agent 管理台。 */
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

type ResourceType = 'order' | 'emr' | 'lab' | 'patient360';
type AgentStatus = 'ready' | 'busy' | 'error';

interface ResourceAgent {
  agentId: string;
  resourceType: ResourceType;
  name: string;
  description: string;
  status: AgentStatus;
  tools: string[];
}

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

interface InvokeResponse {
  agentId: string;
  requestId: string;
  result: string;
  latencyMs: number;
  status: string;
}

const STATUS_COLOR: Record<AgentStatus, string> = {
  ready: 'green',
  busy: 'orange',
  error: 'red',
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  ready: '就绪',
  busy: '繁忙',
  error: '异常',
};

const RESOURCE_LABEL: Record<ResourceType, string> = {
  order: '医嘱',
  emr: '病历',
  lab: '检验检查',
  patient360: '患者360',
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error(`请求失败：${resp.status}`);
  return (await resp.json()) as T;
}

export default function AgentResourcesPage() {
  const [agents, setAgents] = useState<ResourceAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tasks, setTasks] = useState<AgentTaskRecord[]>([]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentAgent, setCurrentAgent] = useState<ResourceAgent | null>(null);
  const [input, setInput] = useState<string>('');
  const [invoking, setInvoking] = useState<boolean>(false);
  const [invokeResult, setInvokeResult] = useState<string>('');

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await getJson<{ items: ResourceAgent[] }>('/api/v1/agent-resources');
      setAgents(data.items || []);
    } catch (e) {
      message.error(`资源 Agent 清单加载失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (agentId: string) => {
    try {
      const data = await getJson<{ items: AgentTaskRecord[] }>(
        `/api/v1/agent-resources/${agentId}/tasks`,
      );
      setTasks(data.items || []);
    } catch {
      setTasks([]);
    }
  };

  useEffect(() => {
    void loadAgents();
  }, []);

  const onOpenCard = (agent: ResourceAgent) => {
    setCurrentAgent(agent);
    setInput('');
    setInvokeResult('');
    setModalOpen(true);
    void loadTasks(agent.agentId);
  };

  const onInvoke = async () => {
    if (!currentAgent) return;
    setInvoking(true);
    try {
      const resp = await fetch(`/api/v1/agent-resources/${currentAgent.agentId}/invoke`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!resp.ok) throw new Error(`调用失败：${resp.status}`);
      const data = (await resp.json()) as InvokeResponse;
      setInvokeResult(data.result);
      message.success(`资源 Agent 调用成功（耗时 ${data.latencyMs}ms）`);
      void loadTasks(currentAgent.agentId);
    } catch (e) {
      message.error(`资源 Agent 调用失败：${(e as Error).message}`);
    } finally {
      setInvoking(false);
    }
  };

  const taskColumns: ColumnsType<AgentTaskRecord> = [
    { title: 'RequestId', dataIndex: 'requestId', key: 'requestId', width: 200 },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 110,
      render: (t: ResourceType) => <Tag>{RESOURCE_LABEL[t] || t}</Tag>,
    },
    { title: '输入摘要', dataIndex: 'inputSummary', key: 'inputSummary', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: AgentTaskRecord['status']) => (
        <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>
          {s === 'success' ? '成功' : s === 'failed' ? '失败' : '运行中'}
        </Tag>
      ),
    },
    { title: '耗时(ms)', dataIndex: 'latencyMs', key: 'latencyMs', width: 100 },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 200 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>资源 Agent 管理台 · AgentFramework</Typography.Title>
      <Typography.Paragraph type="secondary">
        临床资源（医嘱/病历/检验检查/患者360）已暴露为可编排 Agent 接口，点击卡片即可发起调用并查看调用历史。
      </Typography.Paragraph>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {agents.map((agent) => (
            <Col xs={24} sm={12} lg={6} key={agent.agentId}>
              <Card
                hoverable
                onClick={() => onOpenCard(agent)}
                title={
                  <Space>
                    <span>{agent.name}</span>
                    <Tag color={STATUS_COLOR[agent.status]}>{STATUS_LABEL[agent.status]}</Tag>
                  </Space>
                }
              >
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {agent.description}
                </Typography.Text>
                <div style={{ marginTop: 12 }}>
                  {agent.tools.map((t) => (
                    <Tag key={t} style={{ marginBottom: 4 }}>
                      {t}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        调用历史
      </Typography.Title>
      <Table<AgentTaskRecord>
        rowKey="requestId"
        columns={taskColumns}
        dataSource={tasks}
        size="small"
        pagination={{ pageSize: 8 }}
      />

      <Modal
        open={modalOpen}
        title={currentAgent ? `调用资源 Agent：${currentAgent.name}` : '调用资源 Agent'}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
      >
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="调用输入（input）">
            <Input.TextArea
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入要交给资源 Agent 的临床任务描述，例如：为患者 张** 开立血常规医嘱"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={invoking} onClick={() => void onInvoke()} block>
              发起调用
            </Button>
          </Form.Item>
        </Form>
        {invokeResult && (
          <Card size="small" title="调用结果" style={{ marginTop: 8 }}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>{invokeResult}</Typography.Paragraph>
          </Card>
        )}
      </Modal>
    </div>
  );
}
