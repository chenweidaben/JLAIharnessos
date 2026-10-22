/**
 * 健澜科技 jlmedaios - 不良事件上报（M663，配套 M554）
 *
 * 三甲流程：事件 Table（类型/等级 badge/状态 badge）+ 上报表单 Modal
 * （事件类型/等级/经过/原因分析）。
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
import { useAdverseEventV2M663Store } from '@/store/adverseEventV2M663Store';
import {
  AE_LEVEL_META,
  AE_STATUS_META,
  type AdverseEvent,
  type AeLevel,
} from '@/services/api/adverseEventV2M663';

interface CreateFormValues {
  patientId: string;
  eventType: string;
  level: AeLevel;
  description: string;
  causeAnalysis: string;
  reporter: string;
}

const columns: ColumnsType<AdverseEvent> = [
  { title: '事件号', dataIndex: 'id', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '事件类型', dataIndex: 'eventType', width: 130 },
  {
    title: '等级',
    dataIndex: 'level',
    width: 110,
    render: (v: AdverseEvent['level']) => <Tag color={AE_LEVEL_META[v].color}>{AE_LEVEL_META[v].label}</Tag>,
  },
  { title: '发生时间', dataIndex: 'happenedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '经过', dataIndex: 'description', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: AdverseEvent['status']) => <Tag color={AE_STATUS_META[v].color}>{AE_STATUS_META[v].label}</Tag>,
  },
  { title: '上报人', dataIndex: 'reporter', width: 100 },
];

export default function AdverseEventV2M663Page() {
  usePageTitle('不良事件上报');

  const { items, loading, acting, error, demo, load, create } =
    useAdverseEventV2M663Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('不良事件已上报');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="不良事件上报（v2）"
      description="事件类型 / 等级 / 发生时间 / 上报状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`不良事件（${items.length}）`}
        extra={
          <Button type="primary" danger onClick={() => setModalOpen(true)}>
            上报不良事件
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="不良事件上报表单" width={680} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="eventType" label="事件类型" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 200 }} placeholder="如 跌倒 / 用药错误 / 压疮" />
            </Form.Item>
            <Form.Item name="level" label="等级" rules={[{ required: true, message: '必选' }]}>
              <Select
                style={{ width: 160 }}
                options={(Object.keys(AE_LEVEL_META) as AeLevel[]).map((k) => ({
                  value: k,
                  label: AE_LEVEL_META[k].label,
                }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="事件经过" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="causeAnalysis" label="原因分析" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="reporter" label="上报人" rules={[{ required: true, message: '必填' }]}>
            <Input style={{ maxWidth: 200 }} />
          </Form.Item>
          <Space>
            <Button type="primary" danger htmlType="submit" loading={acting}>
              提交
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
