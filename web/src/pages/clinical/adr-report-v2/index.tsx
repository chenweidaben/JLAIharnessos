/**
 * 健澜科技 jlmedaios - ADR 药品不良反应（M641，配套 M557）
 *
 * 三甲流程：ADR Table（药品/反应/严重程度 badge/状态 badge）+ 上报表单 Modal。
 * 权限码 adr:report。
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
import { useAdrReportV2M641Store } from '@/store/adrReportV2M641Store';
import {
  ADR_SEVERITY_META,
  ADR_STATUS_META,
  type AdrReport,
  type AdrSeverity,
} from '@/services/api/adrReportV2M641';

interface CreateFormValues {
  patientId: string;
  drugName: string;
  reaction: string;
  severity: AdrSeverity;
  reporter: string;
}

export default function AdrReportV2M641Page() {
  usePageTitle('ADR 药品不良反应');
  const { hasPermission } = usePermission();
  const canReport = hasPermission('adr:report');

  const { items, loading, acting, error, demo, load, create } =
    useAdrReportV2M641Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<AdrReport> = [
    { title: '报告号', dataIndex: 'id', width: 110 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '药品', dataIndex: 'drugName', width: 200 },
    { title: '不良反应', dataIndex: 'reaction', width: 200 },
    {
      title: '严重程度',
      dataIndex: 'severity',
      width: 110,
      render: (v: AdrReport['severity']) => <Tag color={ADR_SEVERITY_META[v].color}>{ADR_SEVERITY_META[v].label}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: AdrReport['status']) => <Tag color={ADR_STATUS_META[v].color}>{ADR_STATUS_META[v].label}</Tag>,
    },
    { title: '上报时间', dataIndex: 'reportedAt', width: 160, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '上报人', dataIndex: 'reporter', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('ADR 已上报');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="ADR 药品不良反应（v2）"
      description="ADR 列表 + 上报表单"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canReport && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 adr:report 权限" />
      )}

      <Card
        size="small"
        title={`ADR 报告（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            上报 ADR
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="药品不良反应上报表单" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="drugName" label="可疑药品" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="reaction" label="不良反应表现" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="severity" label="严重程度" rules={[{ required: true, message: '必选' }]}>
            <Select
              options={(Object.keys(ADR_SEVERITY_META) as AdrSeverity[]).map((k) => ({
                value: k,
                label: ADR_SEVERITY_META[k].label,
              }))}
            />
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
