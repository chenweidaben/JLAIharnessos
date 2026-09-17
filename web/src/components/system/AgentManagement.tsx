/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Agent管理：Agent列表 + 配置 + 提示词编辑器 + 测试 + 监控 + 日志
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, BugOutlined, PlayCircleOutlined, RobotOutlined } from '@ant-design/icons';
import type { AgentConfig, AgentSessionLog, AgentType, AgentStatus } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

const AGENT_STATUS_COLOR: Record<AgentStatus, string> = {
  online: 'green',
  offline: 'default',
  maintenance: 'orange',
};
const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  online: '在线',
  offline: '离线',
  maintenance: '维护中',
};

export default function AgentManagement() {
  const {
    agentList,
    agentStats,
    agentSessionLogs,
    fetchAgents,
    updateAgentConfig,
    toggleAgentStatus,
    testAgent,
    fetchAgentLogs,
  } = useSystemStore();

  const [tab, setTab] = useState('list');
  const [typeFilter, setTypeFilter] = useState<AgentType | 'all'>('all');
  const [detailAgent, setDetailAgent] = useState<AgentConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testReply, setTestReply] = useState<{ reply: string; tokens: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [configForm] = Form.useForm();

  useEffect(() => {
    void fetchAgents();
    void fetchAgentLogs();
  }, [fetchAgents, fetchAgentLogs]);

  const filtered = useMemo(() => {
    return agentList.filter((a) => typeFilter === 'all' || a.type === typeFilter);
  }, [agentList, typeFilter]);

  const openConfig = (agent: AgentConfig) => {
    setDetailAgent(agent);
    configForm.setFieldsValue(agent);
    setConfigOpen(true);
  };

  const handleConfigSave = async () => {
    if (!detailAgent) return;
    const values = await configForm.validateFields();
    await updateAgentConfig({ ...detailAgent, ...values });
    message.success('Agent配置已保存');
    setConfigOpen(false);
  };

  const handleTest = async () => {
    if (!detailAgent || !testInput.trim()) return;
    setTesting(true);
    setTestReply(null);
    const result = await testAgent(detailAgent.id, testInput);
    setTestReply(result);
    setTesting(false);
  };

  const columns: ColumnsType<AgentConfig> = [
    {
      title: 'Agent名称',
      dataIndex: 'name',
      width: 160,
      render: (n: string) => (
        <Space>
          <RobotOutlined />
          <span>{n}</span>
        </Space>
      ),
    },
    { title: '编码', dataIndex: 'code', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (t: AgentType) => <Tag color="blue">{t}</Tag>,
    },
    { title: '所属科室', dataIndex: 'department', width: 120 },
    {
      title: '模型',
      dataIndex: 'modelConfig',
      width: 120,
      render: (m: AgentConfig['modelConfig']) => m.model,
    },
    { title: '工具数', dataIndex: 'availableTools', width: 70, render: (v: string[]) => v.length },
    {
      title: '会话数',
      key: 'sessions',
      width: 80,
      render: (_, r) => agentStats.find((s) => s.agentCode === r.code)?.activeSessions ?? 0,
    },
    {
      title: '今日调用',
      key: 'todayCalls',
      width: 90,
      render: (_, r) =>
        agentStats.find((s) => s.agentCode === r.code)?.todayCalls.toLocaleString() ?? '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: AgentStatus, r) => (
        <Space>
          <Tag color={AGENT_STATUS_COLOR[s]}>{AGENT_STATUS_LABEL[s]}</Tag>
          <Switch
            size="small"
            checked={s === 'online'}
            onChange={() => void toggleAgentStatus(r.id)}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, r) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openConfig(r)} />
          <Button
            type="text"
            size="small"
            icon={<BugOutlined />}
            onClick={() => {
              setDetailAgent(r);
              setPromptOpen(true);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              setDetailAgent(r);
              setTestOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const logColumns: ColumnsType<AgentSessionLog> = [
    { title: '会话ID', dataIndex: 'sessionId', width: 200 },
    { title: '用户', dataIndex: 'user', width: 100 },
    { title: 'Agent', dataIndex: 'agent', width: 140 },
    { title: '开始时间', dataIndex: 'startTime', width: 160 },
    { title: '结束时间', dataIndex: 'endTime', width: 160 },
    { title: '消息数', dataIndex: 'messageCount', width: 80 },
    { title: 'Token消耗', dataIndex: 'tokenUsed', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'error' ? 'red' : 'blue'}>{s}</Tag>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="m-0 text-lg font-semibold text-ink-primary">Agent管理</h2>
        <p className="mt-1 mb-0 text-sm text-ink-secondary">
          主Agent、科室子代理、专科Agent的配置与监控
        </p>
      </div>

      <Row gutter={16}>
        {agentList.slice(0, 4).map((a) => {
          const stat = agentStats.find((s) => s.agentCode === a.code);
          return (
            <Col span={6} key={a.id}>
              <Card size="small">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.name}</span>
                  <Tag color={AGENT_STATUS_COLOR[a.status]}>{AGENT_STATUS_LABEL[a.status]}</Tag>
                </div>
                <div className="mt-2 text-2xl font-semibold">{stat?.activeSessions ?? 0}</div>
                <div className="text-xs text-ink-secondary">
                  活跃会话 · 今日调用 {(stat?.todayCalls ?? 0).toLocaleString()}
                </div>
                <div className="mt-2">
                  <div className="text-xs text-ink-secondary">
                    响应时间 {stat?.avgResponseMs ?? 0}ms
                  </div>
                  <Progress
                    percent={Math.min(100, Math.round((stat?.avgResponseMs ?? 0) / 30))}
                    size="small"
                    showInfo={false}
                  />
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'list',
              label: 'Agent列表',
              children: (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Button
                      size="small"
                      type={typeFilter === 'all' ? 'primary' : 'default'}
                      onClick={() => setTypeFilter('all')}
                    >
                      全部
                    </Button>
                    {(['主Agent', '科室子代理', '专科Agent'] as AgentType[]).map((t) => (
                      <Button
                        key={t}
                        size="small"
                        type={typeFilter === t ? 'primary' : 'default'}
                        onClick={() => setTypeFilter(t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                  <Table<AgentConfig>
                    rowKey="id"
                    size="middle"
                    columns={columns}
                    dataSource={filtered}
                    scroll={{ x: 1100 }}
                    pagination={{ pageSize: 12 }}
                  />
                </div>
              ),
            },
            {
              key: 'logs',
              label: '会话日志',
              children: (
                <Table<AgentSessionLog>
                  rowKey="sessionId"
                  size="middle"
                  columns={logColumns}
                  dataSource={agentSessionLogs}
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 12 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Agent配置 */}
      <Drawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        width={640}
        title={`配置：${detailAgent?.name ?? ''}`}
        extra={
          <Space>
            <Button onClick={() => setConfigOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleConfigSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={configForm} layout="vertical">
          <Form.Item name="name" label="Agent名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name={['modelConfig', 'model']} label="模型">
            <Select
              options={['claude-sonnet', 'claude-opus', 'claude-haiku', 'jianlan-medical'].map(
                (v) => ({ label: v, value: v }),
              )}
            />
          </Form.Item>
          <Form.Item name={['modelConfig', 'temperature']} label="温度">
            <InputNumber min={0} max={1} step={0.1} className="w-full" />
          </Form.Item>
          <Form.Item name={['modelConfig', 'maxTokens']} label="最大Token">
            <InputNumber min={256} max={128000} className="w-full" />
          </Form.Item>
          <Form.Item name="riskPolicy" label="风险策略">
            <Select
              options={[
                { label: '自动执行', value: 'auto' },
                { label: '需确认', value: 'confirm' },
                { label: '需审批', value: 'approval' },
              ]}
            />
          </Form.Item>
          <Form.Item name="dataScope" label="数据范围">
            <Select
              options={[
                { label: '全部', value: 'all' },
                { label: '本科室', value: 'own_dept' },
                { label: '本人患者', value: 'own_patient' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 提示词编辑器 */}
      <Drawer
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        width={640}
        title={`提示词编辑：${detailAgent?.name ?? ''}`}
      >
        <div className="space-y-3">
          <Card size="small" title="系统提示词">
            <Input.TextArea rows={8} defaultValue={detailAgent?.systemPrompt} />
          </Card>
          <Card size="small" title="角色设定">
            <Input.TextArea rows={4} defaultValue={detailAgent?.rolePrompt} />
          </Card>
          <Card size="small" title="专业领域提示词">
            <Input.TextArea rows={4} defaultValue={detailAgent?.specialtyPrompt} />
          </Card>
          <Button type="primary" onClick={() => message.success('提示词已保存')}>
            保存提示词
          </Button>
        </div>
      </Drawer>

      {/* Agent测试 */}
      <Modal
        open={testOpen}
        title={`对话测试：${detailAgent?.name ?? ''}`}
        width={640}
        onCancel={() => setTestOpen(false)}
        footer={
          <Button type="primary" onClick={() => setTestOpen(false)}>
            关闭
          </Button>
        }
      >
        <div className="mb-3">
          <Input.TextArea
            rows={3}
            placeholder="输入测试对话..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
          />
        </div>
        <Button type="primary" loading={testing} onClick={handleTest}>
          发送
        </Button>
        {testReply && (
          <Card
            size="small"
            title={`Agent回复（消耗 ${testReply.tokens} tokens）`}
            className="mt-3"
          >
            <p className="m-0">{testReply.reply}</p>
          </Card>
        )}
      </Modal>
    </div>
  );
}
