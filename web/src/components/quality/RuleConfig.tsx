/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 质控规则配置：规则列表 + 可视化编辑器 + 规则测试 + 版本管理
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BugOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { QualityRule, RuleCategory, DefectLevel } from '@/types/quality';
import { RULE_CATEGORY_LABEL, DEFECT_LEVEL_LABEL } from '@/types/quality';
import { useQualityStore } from '@/store/qualityStore';

const CATEGORY_COLOR: Record<RuleCategory, string> = {
  integrity: 'blue',
  standardization: 'cyan',
  logic: 'purple',
  timeliness: 'orange',
  veto: 'red',
};

export default function RuleConfig() {
  const {
    qualityRules,
    fetchQualityRules,
    updateQualityRule,
    toggleRuleStatus,
    testRule,
    loading,
  } = useQualityStore();

  const [category, setCategory] = useState<RuleCategory | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QualityRule | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testRuleId, setTestRuleId] = useState('');
  const [testResult, setTestResult] = useState<{
    triggered: boolean;
    hitFields: string[];
    message: string;
  } | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    void fetchQualityRules();
  }, [fetchQualityRules]);

  const filtered = useMemo(() => {
    return qualityRules.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (keyword && !r.name.includes(keyword) && !r.code.includes(keyword)) return false;
      return true;
    });
  }, [qualityRules, category, keyword]);

  const openEditor = (rule?: QualityRule) => {
    setEditing(rule ?? null);
    form.setFieldsValue(
      rule ?? {
        name: '',
        description: '',
        category: 'integrity',
        level: 'minor',
        deduction: 2,
        suggestion: '',
        status: 'enabled',
      },
    );
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateQualityRule({ ...editing, ...values });
      message.success('规则已更新');
    } else {
      message.success('新规则已创建（演示数据）');
    }
    setEditorOpen(false);
  };

  const handleTest = async (ruleId: string) => {
    setTestRuleId(ruleId);
    setTestOpen(true);
    setTestResult(null);
    const res = await testRule(ruleId);
    setTestResult(res);
  };

  const columns: ColumnsType<QualityRule> = [
    { title: '编码', dataIndex: 'code', width: 80 },
    { title: '规则名称', dataIndex: 'name', width: 180 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      render: (c: RuleCategory) => <Tag color={CATEGORY_COLOR[c]}>{RULE_CATEGORY_LABEL[c]}</Tag>,
    },
    {
      title: '等级',
      dataIndex: 'level',
      width: 90,
      render: (l: DefectLevel) => <Tag>{DEFECT_LEVEL_LABEL[l]}</Tag>,
    },
    {
      title: '扣分',
      dataIndex: 'deduction',
      width: 70,
      render: (v: number) => (v === 0 ? '否决' : `-${v}`),
    },
    { title: '命中', dataIndex: 'hitCount', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, r) => (
        <Switch
          size="small"
          checked={r.status === 'enabled'}
          onChange={() => void toggleRuleStatus(r.ruleId)}
        />
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, r) => (
        <Space size={2}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditor(r)}
            />
          </Tooltip>
          <Tooltip title="测试">
            <Button
              type="text"
              size="small"
              icon={<BugOutlined />}
              onClick={() => void handleTest(r.ruleId)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => message.success('规则已删除')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input.Search
            allowClear
            placeholder="规则名称 / 编码"
            style={{ width: 240 }}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => message.success('规则已导出')}>
              导出
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => message.success('请选择规则文件导入')}>
              导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
              新建规则
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="shadow-card">
        <Tabs
          size="small"
          activeKey={category}
          onChange={(k) => setCategory(k as RuleCategory | 'all')}
          items={[
            { key: 'all', label: `全部 (${qualityRules.length})` },
            ...(Object.keys(RULE_CATEGORY_LABEL) as RuleCategory[]).map((c) => ({
              key: c,
              label: `${RULE_CATEGORY_LABEL[c]} (${qualityRules.filter((r) => r.category === c).length})`,
            })),
          ]}
        />
        <Table<QualityRule>
          rowKey="ruleId"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 12, showSizeChanger: false }}
        />
      </Card>

      {/* 规则编辑器 */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        width={560}
        title={editing ? `编辑规则 ${editing.code}` : '新建质控规则'}
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
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input placeholder="如：入院记录24小时内完成" />
          </Form.Item>
          <Form.Item name="description" label="规则描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="category" label="规则分类" rules={[{ required: true }]}>
            <Select
              options={(Object.keys(RULE_CATEGORY_LABEL) as RuleCategory[]).map((k) => ({
                label: RULE_CATEGORY_LABEL[k],
                value: k,
              }))}
            />
          </Form.Item>
          <Form.Item name="level" label="缺陷等级" rules={[{ required: true }]}>
            <Radio.Group>
              {(Object.keys(DEFECT_LEVEL_LABEL) as DefectLevel[]).map((l) => (
                <Radio.Button key={l} value={l}>
                  {DEFECT_LEVEL_LABEL[l]}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="deduction" label="扣分标准" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} addonAfter="分" />
          </Form.Item>

          <Card size="small" title="规则条件（可视化）" className="mb-3">
            <div className="space-y-2">
              <Space.Compact block>
                <Select
                  style={{ width: 140 }}
                  defaultValue="record_type"
                  options={[
                    { label: '病历类型', value: 'record_type' },
                    { label: '时间(小时)', value: 'duration_hours' },
                  ]}
                />
                <Select
                  style={{ width: 110 }}
                  defaultValue=">"
                  options={[
                    { label: '>', value: '>' },
                    { label: '=', value: '=' },
                    { label: '为空', value: 'empty' },
                  ]}
                />
                <Input style={{ width: 120 }} placeholder="值" defaultValue="24" />
              </Space.Compact>
              <div className="text-xs text-ink-secondary">
                逻辑组合：AND（满足全部条件触发规则）
              </div>
            </div>
          </Card>

          <Form.Item name="suggestion" label="整改建议模板">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="启用状态">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 规则测试 */}
      <Modal
        open={testOpen}
        title={`规则测试（${testRuleId}）`}
        onCancel={() => setTestOpen(false)}
        footer={
          <Button type="primary" onClick={() => setTestOpen(false)}>
            关闭
          </Button>
        }
      >
        <p className="text-xs text-ink-secondary">输入一份测试病历，验证规则是否正确触发：</p>
        <Input.TextArea rows={3} placeholder="粘贴病历片段..." className="mb-3" />
        {testResult ? (
          <Alert
            type={testResult.triggered ? 'warning' : 'success'}
            showIcon
            message={testResult.message}
            description={
              testResult.triggered ? (
                <div>
                  <div>命中字段：</div>
                  {testResult.hitFields.map((f) => (
                    <Tag key={f} className="mt-1">
                      {f}
                    </Tag>
                  ))}
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="py-4 text-center text-ink-secondary">正在运行测试...</div>
        )}
      </Modal>
    </div>
  );
}
