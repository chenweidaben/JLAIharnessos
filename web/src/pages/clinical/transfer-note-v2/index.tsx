/**
 * 健澜科技 jlmedaios - 转科记录（M650，配套 M577）
 *
 * 三甲流程：转科 Table（转出→转入、原因、病情摘要）+ 新建 Modal。
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
import { useTransferNoteV2M650Store } from '@/store/transferNoteV2M650Store';
import type { TransferNote } from '@/services/api/transferNoteV2M650';

const DEPT_OPTIONS = ['急诊科', '呼吸科', '心内科', '普外科', 'ICU', '神经内科', '肾内科'].map((v) => ({
  value: v,
  label: v,
}));

interface CreateFormValues {
  patientId: string;
  fromDept: string;
  toDept: string;
  reason: string;
  summary: string;
  doctor: string;
}

export default function TransferNoteV2M650Page() {
  usePageTitle('转科记录');

  const { items, loading, acting, error, demo, load, create } =
    useTransferNoteV2M650Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<TransferNote> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    {
      title: '转出 → 转入',
      width: 220,
      render: (_v, row) => (
        <Space size={4}>
          <Tag color="default">{row.fromDept}</Tag>
          <span style={{ color: '#999' }}>→</span>
          <Tag color="processing">{row.toDept}</Tag>
        </Space>
      ),
    },
    { title: '转科原因', dataIndex: 'reason', ellipsis: true },
    { title: '病情摘要', dataIndex: 'summary', ellipsis: true },
    { title: '转科时间', dataIndex: 'transferredAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '经治医师', dataIndex: 'doctor', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('转科记录已保存');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="转科记录（v2）"
      description="转出科室 / 转入科室 / 转科原因"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`转科记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建转科
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建转科记录" width={680} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="fromDept" label="转出科室" rules={[{ required: true, message: '必选' }]}>
              <Select style={{ width: 180 }} options={DEPT_OPTIONS} />
            </Form.Item>
            <Form.Item name="toDept" label="转入科室" rules={[{ required: true, message: '必选' }]}>
              <Select style={{ width: 180 }} options={DEPT_OPTIONS} />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label="转科原因" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="summary" label="转出病情摘要" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="doctor" label="经治医师" rules={[{ required: true, message: '必填' }]}>
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
