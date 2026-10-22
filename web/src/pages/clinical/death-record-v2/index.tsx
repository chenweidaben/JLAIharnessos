/**
 * 健澜科技 jlmedaios - 死亡记录（M652，配套 M579）
 *
 * 三甲流程：死亡 Table（死亡日期/主要诊断/直接死因/根本死因/尸检同意）+ 新建 Modal。
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
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDeathRecordV2M652Store } from '@/store/deathRecordV2M652Store';
import type { DeathRecord } from '@/services/api/deathRecordV2M652';

interface CreateFormValues {
  patientId: string;
  deceasedAt: string;
  primaryDiagnosis: string;
  directCause: string;
  underlyingCause: string;
  autopsyConsent: boolean;
  recordingDoctor: string;
}

export default function DeathRecordV2M652Page() {
  usePageTitle('死亡记录');

  const { items, loading, acting, error, demo, load, create } =
    useDeathRecordV2M652Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<DeathRecord> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    {
      title: '死亡时间',
      dataIndex: 'deceasedAt',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    { title: '主要诊断', dataIndex: 'primaryDiagnosis', ellipsis: true },
    { title: '直接死因', dataIndex: 'directCause', ellipsis: true },
    { title: '根本死因', dataIndex: 'underlyingCause', ellipsis: true },
    {
      title: '尸检同意',
      dataIndex: 'autopsyConsent',
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">已同意</Tag> : <Tag color="default">未同意</Tag>),
    },
    { title: '记录医师', dataIndex: 'recordingDoctor', width: 110 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('死亡记录已保存');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="死亡记录（v2）"
      description="死亡日期 / 主要诊断 / 直接死因 / 根本死因"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`死亡记录（${items.length}）`}
        extra={
          <Button type="primary" danger onClick={() => setModalOpen(true)}>
            新建死亡记录
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建死亡记录" width={680} onCancel={() => setModalOpen(false)} footer={null}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doCreate}
          initialValues={{ autopsyConsent: false }}
        >
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="deceasedAt" label="死亡时间（ISO，如 2026-10-22T03:00:00+08:00）" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="primaryDiagnosis" label="主要诊断" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="directCause" label="直接死因" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="underlyingCause" label="根本死因" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="autopsyConsent" label="家属尸检同意" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="recordingDoctor" label="记录医师" rules={[{ required: true, message: '必填' }]}>
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
