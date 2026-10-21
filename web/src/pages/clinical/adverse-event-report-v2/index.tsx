/**
 * 健澜科技 jlmedaios - 不良事件上报 v2（M632，P0 合规）
 *
 * 三甲流程：事件 Table（分级 badge 按色标）+ 上报表单 Modal
 *   （事件类型/分级/经过/原因分析）。权限码 adverseEvent:report。
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
import { useAdverseEventReportV2M632Store } from '@/store/adverseEventReportV2M632Store';
import {
  GRADE_META,
  type AdverseEvent,
  type AdverseEventCreateInput,
  type AdverseGrade,
} from '@/services/api/adverseEventReportV2M632';

interface CreateFormValues {
  eventType: string;
  grade: AdverseGrade;
  patientId: string;
  description: string;
  causeAnalysis: string;
  reporter: string;
}

export default function AdverseEventReportV2M632Page() {
  usePageTitle('不良事件上报');
  const { hasPermission } = usePermission();
  const canReport = hasPermission('adverseEvent:report');

  const { items, loading, acting, error, demo, load, create } =
    useAdverseEventReportV2M632Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<AdverseEvent> = [
    { title: '事件编号', dataIndex: 'id', width: 100 },
    { title: '类型', dataIndex: 'eventType', width: 120 },
    {
      title: '分级',
      dataIndex: 'grade',
      width: 200,
      render: (v: AdverseGrade) => <Tag color={GRADE_META[v].color}>{GRADE_META[v].label}</Tag>,
    },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '发生时间', dataIndex: 'happenedAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '经过', dataIndex: 'description', ellipsis: true },
    { title: '上报人', dataIndex: 'reporter', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const payload: AdverseEventCreateInput = {
      ...values,
      happenedAt: new Date().toISOString(),
    };
    const ok = await create(payload);
    if (ok) {
      message.success('不良事件已上报');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="不良事件上报（v2）"
      description="事件列表（I-IV 级分级）+ 上报表单"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canReport && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 adverseEvent:report 权限" />
      )}

      <Card
        size="small"
        title={`事件列表（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            我要上报
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="不良事件上报表单" width={620} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="eventType" label="事件类型" rules={[{ required: true, message: '必选' }]}>
              <Select
                style={{ width: 180 }}
                options={['跌倒', '坠床', '管路滑脱', '给药错误', '压疮', '约束相关'].map((v) => ({ value: v, label: v }))}
              />
            </Form.Item>
            <Form.Item name="grade" label="事件分级" rules={[{ required: true, message: '必选' }]}>
              <Select
                style={{ width: 240 }}
                options={(Object.keys(GRADE_META) as AdverseGrade[]).map((k) => ({
                  value: k,
                  label: GRADE_META[k].label,
                }))}
              />
            </Form.Item>
            <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="事件经过" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="causeAnalysis" label="原因分析">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="reporter" label="上报人" rules={[{ required: true, message: '必填' }]}>
            <Input style={{ maxWidth: 200 }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交上报
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
