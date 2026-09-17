/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工具管理：36个医疗工具列表 + 详情/配置/测试/日志/统计
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, SettingOutlined, BugOutlined } from '@ant-design/icons';
import type { ToolConfig, ToolCallLog, ToolRisk, ToolCategory } from '@/types/system';
import { TOOL_RISK_COLOR } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

const STATUS_COLOR: Record<string, string> = {
  enabled: 'green',
  disabled: 'default',
  maintenance: 'orange',
};
const STATUS_LABEL: Record<string, string> = {
  enabled: '启用',
  disabled: '禁用',
  maintenance: '维护中',
};

export default function ToolManagement() {
  const {
    toolList,
    toolStats,
    toolCallLogs,
    fetchTools,
    updateToolConfig,
    toggleToolStatus,
    testTool,
    fetchToolCallLogs,
  } = useSystemStore();

  const [tab, setTab] = useState('list');
  const [catFilter, setCatFilter] = useState<ToolCategory | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [detailTool, setDetailTool] = useState<ToolConfig | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; data: unknown } | null>(null);
  const [testing, setTesting] = useState(false);
  const [configForm] = Form.useForm();

  useEffect(() => {
    void fetchTools();
    void fetchToolCallLogs();
  }, [fetchTools, fetchToolCallLogs]);

  const filtered = useMemo(() => {
    return toolList.filter((t) => {
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      if (keyword && !t.name.includes(keyword) && !t.code.includes(keyword)) return false;
      return true;
    });
  }, [toolList, catFilter, keyword]);

  const openConfig = (tool: ToolConfig) => {
    setDetailTool(tool);
    configForm.setFieldsValue(tool);
    setConfigOpen(true);
  };

  const handleConfigSave = async () => {
    if (!detailTool) return;
    const values = await configForm.validateFields();
    await updateToolConfig({ ...detailTool, ...values });
    message.success('工具配置已保存');
    setConfigOpen(false);
  };

  const handleTest = async (tool: ToolConfig) => {
    setDetailTool(tool);
    setTestOpen(true);
    setTestResult(null);
    setTesting(true);
    const result = await testTool(tool.code, {});
    setTestResult(result);
    setTesting(false);
  };

  const columns: ColumnsType<ToolConfig> = [
    { title: '工具名称', dataIndex: 'name', width: 180 },
    { title: '编码', dataIndex: 'code', width: 180 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 90,
      render: (c: string) => <Tag color="blue">{c}</Tag>,
    },
    {
      title: '风险',
      dataIndex: 'risk',
      width: 70,
      render: (r: ToolRisk) => <Tag color={TOOL_RISK_COLOR[r]}>{r.toUpperCase()}</Tag>,
    },
    {
      title: '调用次数',
      key: 'calls',
      width: 90,
      render: (_, r) =>
        toolStats.find((s) => s.toolCode === r.code)?.callCount.toLocaleString() ?? '-',
    },
    {
      title: '成功率',
      key: 'success',
      width: 80,
      render: (_, r) => {
        const s = toolStats.find((s) => s.toolCode === r.code);
        return s ? (
          <span className={s.successRate >= 95 ? 'text-success' : 'text-danger'}>
            {s.successRate}%
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string, r) => (
        <Space>
          <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>
          <Switch
            size="small"
            checked={s === 'enabled'}
            onChange={() => void toggleToolStatus(r.id)}
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
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetailTool(r);
              setDetailOpen(true);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => openConfig(r)}
          />
          <Button
            type="text"
            size="small"
            icon={<BugOutlined />}
            onClick={() => void handleTest(r)}
          />
        </Space>
      ),
    },
  ];

  const logColumns: ColumnsType<ToolCallLog> = [
    { title: '时间', dataIndex: 'time', width: 160 },
    { title: '工具', dataIndex: 'toolCode', width: 180 },
    { title: '调用人', dataIndex: 'caller', width: 100 },
    { title: '角色', dataIndex: 'callerRole', width: 90 },
    { title: '耗时', dataIndex: 'durationMs', width: 80, render: (v: number) => `${v}ms` },
    {
      title: '结果',
      dataIndex: 'result',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : 'red'}>{s === 'success' ? '成功' : '失败'}</Tag>
      ),
    },
    { title: '错误信息', dataIndex: 'error', ellipsis: true },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="m-0 text-lg font-semibold text-ink-primary">工具管理</h2>
        <p className="mt-1 mb-0 text-sm text-ink-secondary">
          共 {toolList.length} 个医疗工具，覆盖患者管理、病历、医嘱、处方、CDS、质控等场景
        </p>
      </div>

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'list',
              label: '工具列表',
              children: (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <Space wrap>
                      <Button
                        size="small"
                        type={catFilter === 'all' ? 'primary' : 'default'}
                        onClick={() => setCatFilter('all')}
                      >
                        全部
                      </Button>
                      {(
                        [
                          '患者管理',
                          '病历',
                          '医嘱',
                          '处方',
                          '检验',
                          'CDS',
                          '质控',
                          '患者服务',
                          '运营',
                          '系统集成',
                        ] as ToolCategory[]
                      ).map((c) => (
                        <Button
                          key={c}
                          size="small"
                          type={catFilter === c ? 'primary' : 'default'}
                          onClick={() => setCatFilter(c)}
                        >
                          {c}
                        </Button>
                      ))}
                    </Space>
                    <Input.Search
                      allowClear
                      placeholder="工具名称/编码"
                      style={{ width: 200 }}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>
                  <Table<ToolConfig>
                    rowKey="id"
                    size="middle"
                    columns={columns}
                    dataSource={filtered}
                    scroll={{ x: 1000 }}
                    pagination={{ pageSize: 15 }}
                  />
                </div>
              ),
            },
            {
              key: 'logs',
              label: '调用日志',
              children: (
                <Table<ToolCallLog>
                  rowKey="id"
                  size="middle"
                  columns={logColumns}
                  dataSource={toolCallLogs}
                  scroll={{ x: 900 }}
                  pagination={{ pageSize: 15 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 工具详情 */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={640}
        title={detailTool?.name}
        extra={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
      >
        {detailTool && (
          <div>
            <p className="text-sm text-ink-secondary mb-3">{detailTool.description}</p>
            <Card size="small" title="输入参数" className="mb-3">
              {detailTool.inputParams.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-sm mb-1">
                  <Tag>{p.name}</Tag>
                  <span className="text-ink-secondary">{p.type}</span>
                  {p.required && <Tag color="red">必填</Tag>}
                  <span>{p.description}</span>
                </div>
              ))}
            </Card>
            <Card size="small" title="错误码" className="mb-3">
              {detailTool.errorCodes.map((e) => (
                <div key={e.code} className="text-sm mb-1">
                  <Tag color="red">{e.code}</Tag>
                  {e.message}
                </div>
              ))}
            </Card>
          </div>
        )}
      </Drawer>

      {/* 工具配置 */}
      <Drawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        width={560}
        title="工具运行配置"
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
          <Form.Item name="requireConfirm" label="需要二次确认" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="confirmTimeout" label="确认超时(秒)">
            <InputNumber min={5} max={120} className="w-full" />
          </Form.Item>
          <Form.Item name="rateLimitPerMinute" label="每分钟最大调用次数">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="rateLimitPerDay" label="每日最大调用次数">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="timeoutSeconds" label="超时时间(秒)">
            <InputNumber min={1} max={120} className="w-full" />
          </Form.Item>
          <Form.Item name="retryCount" label="重试次数">
            <InputNumber min={0} max={5} className="w-full" />
          </Form.Item>
          <Form.Item name="retryIntervalMs" label="重试间隔(毫秒)">
            <InputNumber min={100} step={100} className="w-full" />
          </Form.Item>
          <Form.Item name="mockMode" label="Mock模式（演示环境）" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 工具测试 */}
      <Drawer
        open={testOpen}
        onClose={() => setTestOpen(false)}
        width={560}
        title={`工具测试：${detailTool?.name ?? ''}`}
        extra={<Button onClick={() => setTestOpen(false)}>关闭</Button>}
      >
        <Card size="small" title="测试参数" className="mb-3">
          {detailTool?.inputParams.map((p) => (
            <Form.Item key={p.name} label={`${p.name} (${p.type})`} required={p.required}>
              <Input placeholder={p.example ?? p.description} />
            </Form.Item>
          ))}
        </Card>
        <Button
          type="primary"
          loading={testing}
          onClick={() => detailTool && void handleTest(detailTool)}
        >
          执行测试
        </Button>
        {testResult && (
          <Card size="small" title="测试结果" className="mt-3">
            <pre className="text-xs bg-ink-bg p-2 rounded overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </Card>
        )}
      </Drawer>
    </div>
  );
}
