/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * CDS规则管理：规则列表 + 可视化编辑器 + 规则测试 + 发布管理 + 统计
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
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
import { PlusOutlined, EditOutlined, DeleteOutlined, BugOutlined } from '@ant-design/icons';
import type { CDSRule, CDSRuleType, CDSRuleLevel, CDSTestResult } from '@/types/system';
import { CD_RULE_TYPE_LABEL } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

const LEVEL_COLOR: Record<string, string> = { 高: 'red', 中: 'orange', 低: 'blue' };
const ACTION_LABEL: Record<string, string> = {
  alert: '告警',
  warning: '警告',
  block: '阻断',
  suggest: '建议',
  log: '记录',
};
const ACTION_COLOR: Record<string, string> = {
  alert: 'red',
  warning: 'orange',
  block: 'red',
  suggest: 'blue',
  log: 'default',
};

export default function CDSRuleManagement() {
  const { cdsRules, fetchCDSRules, updateCDSRule, toggleCDSRule, testCDSRule } = useSystemStore();
  const [tab, setTab] = useState('list');
  const [typeFilter, setTypeFilter] = useState<CDSRuleType | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CDSRule | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testResult, setTestResult] = useState<CDSTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    void fetchCDSRules();
  }, [fetchCDSRules]);

  const filtered = useMemo(() => {
    return cdsRules.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (keyword && !r.name.includes(keyword) && !r.code.includes(keyword)) return false;
      return true;
    });
  }, [cdsRules, typeFilter, keyword]);

  const stats = useMemo(() => {
    const enabled = cdsRules.filter((r) => r.status === 'enabled').length;
    const totalTriggers = cdsRules.reduce((s, r) => s + r.triggerCount, 0);
    const top10 = [...cdsRules].sort((a, b) => b.triggerCount - a.triggerCount).slice(0, 10);
    const byType = (Object.keys(CD_RULE_TYPE_LABEL) as CDSRuleType[]).map((t) => ({
      type: t,
      count: cdsRules.filter((r) => r.type === t).length,
    }));
    return {
      total: cdsRules.length,
      enabled,
      disabled: cdsRules.length - enabled,
      totalTriggers,
      top10,
      byType,
    };
  }, [cdsRules]);

  const openEditor = (rule?: CDSRule) => {
    setEditing(rule ?? null);
    form.setFieldsValue(
      rule ?? {
        name: '',
        code: '',
        description: '',
        type: '药物相互作用',
        level: '中',
        action: 'warning',
        messageTemplate: '',
        evidenceSource: '',
        status: 'draft',
      },
    );
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateCDSRule({ ...editing, ...values });
      message.success('规则已更新');
    } else {
      await updateCDSRule({
        id: `rule_${Date.now()}`,
        version: 'v1.0.0',
        triggerCount: 0,
        hitRate: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
        updatedBy: '当前用户',
        conditions: [],
        applicableDepts: [],
        applicableDoctorLevels: [],
        applicablePatientTypes: [],
        ...values,
      });
      message.success('规则已创建');
    }
    setEditorOpen(false);
  };

  const handleTest = async (ruleId: string) => {
    setTestOpen(true);
    setTestResult(null);
    setTesting(true);
    const result = await testCDSRule(ruleId);
    setTestResult(result);
    setTesting(false);
  };

  const columns: ColumnsType<CDSRule> = [
    { title: '规则编码', dataIndex: 'code', width: 110 },
    { title: '规则名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (t: CDSRuleType) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: '等级',
      dataIndex: 'level',
      width: 70,
      render: (l: CDSRuleLevel) => <Tag color={LEVEL_COLOR[l]}>{l}</Tag>,
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 80,
      render: (a: string) => <Tag color={ACTION_COLOR[a]}>{ACTION_LABEL[a]}</Tag>,
    },
    {
      title: '触发次数',
      dataIndex: 'triggerCount',
      width: 90,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string, r) => (
        <Switch size="small" checked={s === 'enabled'} onChange={() => void toggleCDSRule(r.id)} />
      ),
    },
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditor(r)} />
          <Button
            type="text"
            size="small"
            icon={<BugOutlined />}
            onClick={() => void handleTest(r.id)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => message.success('规则已删除')}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink-primary">CDS规则管理</h2>
          <p className="mt-1 mb-0 text-sm text-ink-secondary">
            临床决策支持规则的可视化配置、测试与发布管理
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
          新建规则
        </Button>
      </div>

      <Row gutter={16}>
        {[
          { title: '规则总数', value: stats.total, color: '#0A4D8C' },
          { title: '已启用', value: stats.enabled, color: '#52C41A' },
          { title: '已禁用', value: stats.disabled, color: '#8C8C8C' },
          { title: '累计触发', value: stats.totalTriggers.toLocaleString(), color: '#FA8C16' },
        ].map((s) => (
          <Col span={6} key={s.title}>
            <Card size="small">
              <div className="text-sm text-ink-secondary">{s.title}</div>
              <div className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>
                {s.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'list',
              label: '规则列表',
              children: (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <Space wrap>
                      <Button
                        size="small"
                        type={typeFilter === 'all' ? 'primary' : 'default'}
                        onClick={() => setTypeFilter('all')}
                      >
                        全部
                      </Button>
                      {(Object.keys(CD_RULE_TYPE_LABEL) as CDSRuleType[]).map((t) => (
                        <Button
                          key={t}
                          size="small"
                          type={typeFilter === t ? 'primary' : 'default'}
                          onClick={() => setTypeFilter(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </Space>
                    <Input.Search
                      allowClear
                      placeholder="规则名称/编码"
                      style={{ width: 200 }}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>
                  <Table<CDSRule>
                    rowKey="id"
                    size="middle"
                    columns={columns}
                    dataSource={filtered}
                    scroll={{ x: 1000 }}
                    pagination={{ pageSize: 12 }}
                  />
                </div>
              ),
            },
            {
              key: 'stats',
              label: '规则统计',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="各类型规则数量">
                      {stats.byType.map((b) => (
                        <div key={b.type} className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{b.type}</span>
                            <span>{b.count}条</span>
                          </div>
                          <Progress
                            percent={
                              cdsRules.length > 0
                                ? Math.round((b.count / cdsRules.length) * 100)
                                : 0
                            }
                            showInfo={false}
                            size="small"
                          />
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="高频触发规则 TOP10">
                      {stats.top10.map((r, i) => (
                        <div key={r.id} className="flex items-center gap-2 mb-1 text-sm">
                          <Tag color={i < 3 ? 'red' : 'default'}>{i + 1}</Tag>
                          <span className="flex-1 truncate">{r.name}</span>
                          <span className="text-ink-secondary">
                            {r.triggerCount.toLocaleString()}次
                          </span>
                        </div>
                      ))}
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* 规则编辑器 */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        width={680}
        title={editing ? `编辑规则 ${editing.code}` : '新建CDS规则'}
        extra={
          <Space>
            <Button onClick={() => setEditorOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="规则编码" rules={[{ required: true }]}>
                <Input placeholder="CDS-XX-001" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="规则描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="type" label="规则类型">
                <Select
                  options={(Object.keys(CD_RULE_TYPE_LABEL) as CDSRuleType[]).map((k) => ({
                    label: k,
                    value: k,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="level" label="规则等级">
                <Select options={['高', '中', '低'].map((v) => ({ label: v, value: v }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="action" label="触发动作">
                <Select
                  options={Object.entries(ACTION_LABEL).map(([k, v]) => ({ label: v, value: k }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Card size="small" title="条件配置（可视化）" className="mb-3">
            <div className="space-y-2">
              <Alert
                message="支持患者属性、诊断、检验、药品、医嘱、生命体征等字段的可视化条件组合"
                type="info"
                showIcon
              />
              <div className="p-3 bg-ink-bg rounded text-sm">
                <div className="text-ink-secondary mb-2">
                  条件1：药品名称 包含 "阿司匹林" <Tag color="blue">AND</Tag>
                </div>
                <div className="text-ink-secondary">条件2：患者年龄 &gt; 18</div>
              </div>
              <Button size="small" icon={<PlusOutlined />}>
                添加条件
              </Button>
            </div>
          </Card>
          <Form.Item name="messageTemplate" label="消息模板（支持变量）">
            <Input.TextArea rows={3} placeholder="如：警告：{患者姓名}使用{药品名称}存在风险" />
          </Form.Item>
          <Form.Item name="evidenceSource" label="证据来源">
            <Input placeholder="指南名称、版本、章节" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 规则测试 */}
      <Modal
        open={testOpen}
        title="规则测试"
        width={640}
        onCancel={() => setTestOpen(false)}
        footer={
          <Button type="primary" onClick={() => setTestOpen(false)}>
            关闭
          </Button>
        }
      >
        <Input.TextArea
          rows={3}
          placeholder="模拟患者数据：患者年龄、诊断、检验结果、药品列表..."
          className="mb-3"
        />
        {testing && <div className="py-4 text-center text-ink-secondary">正在运行测试...</div>}
        {testResult && !testing && (
          <Alert
            type={testResult.triggered ? 'warning' : 'success'}
            showIcon
            message={testResult.triggered ? '规则已触发' : '规则未触发'}
            description={
              <div>
                <p className="m-0 mb-2">{testResult.message}</p>
                {testResult.matchedConditions.map((c) => (
                  <Tag key={c} className="mr-1 mb-1">
                    {c}
                  </Tag>
                ))}
              </div>
            }
          />
        )}
      </Modal>
    </div>
  );
}
