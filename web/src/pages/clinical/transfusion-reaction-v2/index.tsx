/**
 * 健澜科技 jlmedaios - 输血反应记录（M639，配套 M555）
 *
 * 三甲流程：反应 Table（类型/严重程度 badge/处理措施）+ 上报 Modal。
 * 权限码 transfusion:reportReaction。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useTransfusionReactionV2M639Store } from '@/store/transfusionReactionV2M639Store';
import {
  SEVERITY_META,
  type ReactionSeverity,
  type TransfusionReaction,
} from '@/services/api/transfusionReactionV2M639';

interface CreateFormValues {
  patientId: string;
  product: string;
  reactionType: string;
  severity: ReactionSeverity;
  treatment: string;
  reporter: string;
}

export default function TransfusionReactionV2M639Page() {
  usePageTitle('输血反应记录');
  const { hasPermission } = usePermission();
  const canReport = hasPermission('transfusion:reportReaction');

  const { items, loading, acting, error, demo, load, create } =
    useTransfusionReactionV2M639Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<TransfusionReaction> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '血液成分', dataIndex: 'product', width: 180 },
    { title: '反应类型', dataIndex: 'reactionType', width: 160 },
    {
      title: '严重程度',
      dataIndex: 'severity',
      width: 110,
      render: (v: ReactionSeverity) => (
        <Tag color={SEVERITY_META[v].color}>{SEVERITY_META[v].label}</Tag>
      ),
    },
    { title: '发生时间', dataIndex: 'happenedAt', width: 160, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '处理措施', dataIndex: 'treatment', ellipsis: true },
    { title: '上报人', dataIndex: 'reporter', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('输血反应已上报');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="输血反应记录（v2）"
      description="输血反应类型 / 严重程度 / 处理措施"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canReport && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 transfusion:reportReaction 权限" />
      )}

      <Card
        size="small"
        title={`反应记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            上报反应
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="上报输血反应" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="product" label="血液成分" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="reactionType" label="反应类型" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 200 }} placeholder="如 过敏反应" />
            </Form.Item>
            <Form.Item name="severity" label="严重程度" rules={[{ required: true, message: '必选' }]}>
              <Select
                style={{ width: 140 }}
                options={(Object.keys(SEVERITY_META) as ReactionSeverity[]).map((k) => ({
                  value: k,
                  label: SEVERITY_META[k].label,
                }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="treatment" label="处理措施" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="reporter" label="上报人" rules={[{ required: true, message: '必填' }]}>
            <Input style={{ maxWidth: 200 }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
