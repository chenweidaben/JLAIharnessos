/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 集成管理：8个集成系统列表 + 配置 + 连接测试 + 日志 + 监控 + 消息总线
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ApiOutlined, WifiOutlined, FileTextOutlined } from '@ant-design/icons';
import type {
  IntegrationConfig,
  IntegrationLog,
  IntegrationType,
  ConnectionStatus,
  ConnectionMethod,
} from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

const CONN_STATUS_COLOR: Record<ConnectionStatus, string> = {
  connected: 'green',
  disconnected: 'default',
  error: 'red',
  maintenance: 'orange',
};
const CONN_STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: '已连接',
  disconnected: '未连接',
  error: '连接异常',
  maintenance: '维护中',
};

export default function IntegrationManagement() {
  const {
    integrationConfig,
    integrationLogs,
    messageTopics,
    fetchIntegrationConfig,
    updateIntegration,
    testIntegration,
    fetchIntegrationLogs,
  } = useSystemStore();

  const [tab, setTab] = useState('list');
  const [detailIg, setDetailIg] = useState<IntegrationConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [testResult, setTestResult] = useState<{
    igId: string;
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [configForm] = Form.useForm();

  useEffect(() => {
    void fetchIntegrationConfig();
    void fetchIntegrationLogs();
  }, [fetchIntegrationConfig, fetchIntegrationLogs]);

  const openConfig = (ig: IntegrationConfig) => {
    setDetailIg(ig);
    configForm.setFieldsValue(ig);
    setConfigOpen(true);
  };

  const handleConfigSave = async () => {
    if (!detailIg) return;
    const values = await configForm.validateFields();
    await updateIntegration({ ...detailIg, ...values });
    message.success('集成配置已保存');
    setConfigOpen(false);
  };

  const handleTest = async (igId: string) => {
    setTestingId(igId);
    setTestResult(null);
    const result = await testIntegration(igId);
    setTestResult({ igId, ...result });
    setTestingId(null);
  };

  const columns: ColumnsType<IntegrationConfig> = [
    { title: '系统名称', dataIndex: 'name', width: 140 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (t: IntegrationType) => <Tag color="blue">{t}</Tag>,
    },
    { title: '厂商', dataIndex: 'vendor', width: 100 },
    {
      title: '连接方式',
      dataIndex: 'method',
      width: 100,
      render: (m: ConnectionMethod) => <Tag>{m}</Tag>,
    },
    { title: 'Endpoint', dataIndex: 'endpoint', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: ConnectionStatus) => (
        <Tag color={CONN_STATUS_COLOR[s]}>{CONN_STATUS_LABEL[s]}</Tag>
      ),
    },
    { title: '最后同步', dataIndex: 'lastSyncTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, r) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<ApiOutlined />} onClick={() => openConfig(r)} />
          <Button
            type="text"
            size="small"
            icon={<WifiOutlined />}
            loading={testingId === r.id}
            onClick={() => void handleTest(r.id)}
          />
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => message.info('查看日志')}
          />
        </Space>
      ),
    },
  ];

  const logColumns: ColumnsType<IntegrationLog> = [
    { title: '时间', dataIndex: 'time', width: 160 },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 70,
      render: (d: string) => (
        <Tag color={d === 'in' ? 'blue' : 'green'}>{d === 'in' ? '接收' : '推送'}</Tag>
      ),
    },
    { title: '数据类型', dataIndex: 'dataType', width: 120 },
    { title: '记录数', dataIndex: 'recordCount', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'orange'}>{s}</Tag>
      ),
    },
    { title: '耗时', dataIndex: 'durationMs', width: 80, render: (v: number) => `${v}ms` },
    { title: '错误信息', dataIndex: 'error', ellipsis: true },
  ];

  const connectedCount = integrationConfig.filter((i) => i.status === 'connected').length;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="m-0 text-lg font-semibold text-ink-primary">集成管理</h2>
        <p className="mt-1 mb-0 text-sm text-ink-secondary">
          HIS、EMR、LIS、PACS、医保、CA、HRP、OA 等系统集成配置与监控
        </p>
      </div>

      <Row gutter={16}>
        {[
          { title: '集成系统总数', value: integrationConfig.length },
          { title: '已连接', value: connectedCount },
          {
            title: '连接异常',
            value: integrationConfig.filter((i) => i.status === 'error').length,
          },
          {
            title: '维护中',
            value: integrationConfig.filter((i) => i.status === 'maintenance').length,
          },
        ].map((s) => (
          <Col span={6} key={s.title}>
            <Card size="small">
              <div className="text-sm text-ink-secondary">{s.title}</div>
              <div className="mt-1 text-2xl font-semibold">{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {testResult && (
        <Alert
          type={testResult.success ? 'success' : 'error'}
          showIcon
          message={testResult.success ? `连接成功（延迟 ${testResult.latencyMs}ms）` : '连接失败'}
          description={testResult.message}
          closable
          onClose={() => setTestResult(null)}
        />
      )}

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'list',
              label: '集成系统列表',
              children: (
                <Table<IntegrationConfig>
                  rowKey="id"
                  size="middle"
                  columns={columns}
                  dataSource={integrationConfig}
                  scroll={{ x: 1000 }}
                  pagination={false}
                />
              ),
            },
            {
              key: 'logs',
              label: '集成日志',
              children: (
                <Table<IntegrationLog>
                  rowKey="id"
                  size="middle"
                  columns={logColumns}
                  dataSource={integrationLogs}
                  scroll={{ x: 900 }}
                  pagination={{ pageSize: 15 }}
                />
              ),
            },
            {
              key: 'mq',
              label: '消息总线监控',
              children: (
                <Table
                  rowKey="name"
                  size="middle"
                  columns={[
                    { title: '主题/队列', dataIndex: 'name' },
                    {
                      title: '类型',
                      dataIndex: 'type',
                      width: 90,
                      render: (t: string) => (
                        <Tag color={t === 'Topic' ? 'blue' : 'orange'}>{t}</Tag>
                      ),
                    },
                    {
                      title: '消息堆积',
                      dataIndex: 'backlog',
                      width: 100,
                      render: (v: number) => (
                        <span className={v > 100 ? 'text-danger font-medium' : ''}>{v}</span>
                      ),
                    },
                    { title: '消费者数', dataIndex: 'consumerCount', width: 90 },
                    { title: '吞吐(条/秒)', dataIndex: 'throughput', width: 110 },
                    {
                      title: '死信数',
                      dataIndex: 'deadLetter',
                      width: 90,
                      render: (v: number) => (v > 0 ? <Tag color="red">{v}</Tag> : 0),
                    },
                  ]}
                  dataSource={messageTopics}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 集成配置 */}
      <Drawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        width={640}
        title={`集成配置：${detailIg?.name ?? ''}`}
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="系统名称">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vendor" label="厂商">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="endpoint" label="Endpoint">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="port" label="端口">
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="authType" label="认证方式">
                <Select
                  options={['none', 'basic', 'token', 'apikey', 'certificate'].map((v) => ({
                    label: v,
                    value: v,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="syncStrategy" label="同步策略">
            <Select
              options={[
                { label: '实时', value: 'realtime' },
                { label: '定时', value: 'scheduled' },
                { label: '手动', value: 'manual' },
              ]}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxRetries" label="最大重试次数">
                <InputNumber min={0} max={10} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeoutSeconds" label="超时(秒)">
                <InputNumber min={1} max={120} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
}
