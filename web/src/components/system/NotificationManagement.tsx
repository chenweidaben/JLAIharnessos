/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 消息通知管理：模板管理 + 推送规则 + 通知记录 + 统计
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
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
import { EditOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import type {
  NotificationTemplate,
  PushRule,
  NotificationRecord,
  NotifyChannel,
} from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

const CHANNEL_COLOR: Record<string, string> = {
  站内信: 'blue',
  短信: 'green',
  邮件: 'cyan',
  微信: 'success',
  企业微信: 'geekblue',
  钉钉: 'blue',
  APP推送: 'purple',
};

export default function NotificationManagement() {
  const {
    notificationTemplates,
    pushRules,
    notificationRecords,
    fetchNotificationTemplates,
    updateNotificationTemplate,
    fetchPushRules,
    updatePushRule,
    fetchNotificationRecords,
  } = useSystemStore();

  const [tab, setTab] = useState('templates');
  const [detailTpl, setDetailTpl] = useState<NotificationTemplate | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [ruleDetail, setRuleDetail] = useState<PushRule | null>(null);
  const [ruleEditOpen, setRuleEditOpen] = useState(false);
  const [tplForm] = Form.useForm();
  const [ruleForm] = Form.useForm();

  useEffect(() => {
    void fetchNotificationTemplates();
    void fetchPushRules();
    void fetchNotificationRecords();
  }, [fetchNotificationTemplates, fetchPushRules, fetchNotificationRecords]);

  const openEdit = (tpl: NotificationTemplate) => {
    setDetailTpl(tpl);
    tplForm.setFieldsValue(tpl);
    setEditOpen(true);
  };

  const handleTplSave = async () => {
    if (!detailTpl) return;
    const values = await tplForm.validateFields();
    await updateNotificationTemplate({ ...detailTpl, ...values });
    message.success('模板已保存');
    setEditOpen(false);
  };

  const openRuleEdit = (rule: PushRule) => {
    setRuleDetail(rule);
    ruleForm.setFieldsValue(rule);
    setRuleEditOpen(true);
  };

  const handleRuleSave = async () => {
    if (!ruleDetail) return;
    const values = await ruleForm.validateFields();
    await updatePushRule({ ...ruleDetail, ...values });
    message.success('推送规则已保存');
    setRuleEditOpen(false);
  };

  const tplColumns: ColumnsType<NotificationTemplate> = [
    { title: '模板名称', dataIndex: 'name', width: 180 },
    { title: '类型', dataIndex: 'type', width: 110 },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 100,
      render: (c: NotifyChannel) => <Tag color={CHANNEL_COLOR[c]}>{c}</Tag>,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '变量数', dataIndex: 'variables', width: 80, render: (v: string[]) => v.length },
    { title: '版本', dataIndex: 'version', width: 70 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'enabled' ? 'green' : 'default'}>{s === 'enabled' ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => message.info('预览：' + r.title)}
          />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button
            type="text"
            size="small"
            icon={<SendOutlined />}
            onClick={() => message.success('测试通知已发送')}
          />
        </Space>
      ),
    },
  ];

  const ruleColumns: ColumnsType<PushRule> = [
    { title: '规则名称', dataIndex: 'name', width: 160 },
    { title: '触发事件', dataIndex: 'triggerEvent', width: 130 },
    {
      title: '通知渠道',
      dataIndex: 'channels',
      width: 160,
      render: (c: NotifyChannel[]) =>
        c.map((ch) => (
          <Tag key={ch} color={CHANNEL_COLOR[ch]}>
            {ch}
          </Tag>
        )),
    },
    {
      title: '发送时机',
      dataIndex: 'sendTiming',
      width: 90,
      render: (v: string) =>
        (({ immediate: '立即', scheduled: '定时', digest: '汇总' }) as Record<string, string>)[v] ??
        v,
    },
    {
      title: '升级策略',
      dataIndex: 'escalationEnabled',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="orange">开启</Tag> : <Tag>关闭</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'enabled' ? 'green' : 'default'}>{s === 'enabled' ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, r) => (
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openRuleEdit(r)} />
      ),
    },
  ];

  const recordColumns: ColumnsType<NotificationRecord> = [
    { title: '时间', dataIndex: 'sentAt', width: 160 },
    { title: '模板', dataIndex: 'templateName', width: 180 },
    { title: '接收人', dataIndex: 'recipient', width: 100 },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 100,
      render: (c: NotifyChannel) => <Tag color={CHANNEL_COLOR[c]}>{c}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'sent' ? 'green' : s === 'failed' ? 'red' : 'orange'}>{s}</Tag>
      ),
    },
    {
      title: '阅读状态',
      dataIndex: 'readStatus',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'read' ? 'blue' : 'default'}>{s === 'read' ? '已读' : '未读'}</Tag>
      ),
    },
    { title: '阅读时间', dataIndex: 'readAt', width: 160 },
    { title: '失败原因', dataIndex: 'failReason', ellipsis: true },
  ];

  const sentCount = notificationRecords.filter((r) => r.status === 'sent').length;
  const readCount = notificationRecords.filter((r) => r.readStatus === 'read').length;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="m-0 text-lg font-semibold text-ink-primary">消息通知管理</h2>
        <p className="mt-1 mb-0 text-sm text-ink-secondary">通知模板、推送规则、发送记录与统计</p>
      </div>

      <Row gutter={16}>
        {[
          { title: '通知模板', value: notificationTemplates.length },
          { title: '推送规则', value: pushRules.length },
          { title: '今日发送', value: sentCount },
          {
            title: '阅读率',
            value:
              notificationRecords.length > 0
                ? `${Math.round((readCount / notificationRecords.length) * 100)}%`
                : '0%',
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

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'templates',
              label: '通知模板',
              children: (
                <Table<NotificationTemplate>
                  rowKey="id"
                  size="middle"
                  columns={tplColumns}
                  dataSource={notificationTemplates}
                  scroll={{ x: 1100 }}
                  pagination={{ pageSize: 12 }}
                />
              ),
            },
            {
              key: 'rules',
              label: '推送规则',
              children: (
                <Table<PushRule>
                  rowKey="id"
                  size="middle"
                  columns={ruleColumns}
                  dataSource={pushRules}
                  scroll={{ x: 900 }}
                  pagination={false}
                />
              ),
            },
            {
              key: 'records',
              label: '发送记录',
              children: (
                <Table<NotificationRecord>
                  rowKey="id"
                  size="middle"
                  columns={recordColumns}
                  dataSource={notificationRecords}
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 15 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 模板编辑 */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width={560}
        title="编辑通知模板"
        extra={
          <Space>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleTplSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={tplForm} layout="vertical">
          <Form.Item name="name" label="模板名称">
            <Input />
          </Form.Item>
          <Form.Item name="channel" label="通知渠道">
            <Select
              options={['站内信', '短信', '邮件', '微信', '企业微信', '钉钉', 'APP推送'].map(
                (v) => ({ label: v, value: v }),
              )}
            />
          </Form.Item>
          <Form.Item name="title" label="标题（支持变量）">
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容（支持变量替换）">
            <Input.TextArea rows={6} />
          </Form.Item>
          <Card size="small" title="可用变量" className="mb-3">
            {(detailTpl?.variables ?? []).map((v) => (
              <Tag key={v} className="mr-1 mb-1">{`{${v}}`}</Tag>
            ))}
          </Card>
        </Form>
      </Drawer>

      {/* 推送规则编辑 */}
      <Drawer
        open={ruleEditOpen}
        onClose={() => setRuleEditOpen(false)}
        width={560}
        title="编辑推送规则"
        extra={
          <Space>
            <Button onClick={() => setRuleEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleRuleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={ruleForm} layout="vertical">
          <Form.Item name="name" label="规则名称">
            <Input />
          </Form.Item>
          <Form.Item name="triggerEvent" label="触发事件">
            <Input />
          </Form.Item>
          <Form.Item name="channels" label="通知渠道">
            <Select
              mode="multiple"
              options={['站内信', '短信', '邮件', '微信', '企业微信', '钉钉', 'APP推送'].map(
                (v) => ({ label: v, value: v }),
              )}
            />
          </Form.Item>
          <Form.Item name="sendTiming" label="发送时机">
            <Select
              options={[
                { label: '立即', value: 'immediate' },
                { label: '定时', value: 'scheduled' },
                { label: '汇总发送', value: 'digest' },
              ]}
            />
          </Form.Item>
          <Form.Item name="escalationEnabled" label="升级策略" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="escalationMinutes" label="升级时间(分钟)">
            <Input className="w-full" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
