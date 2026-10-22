/**
 * 健澜科技 jlmedaios - 会诊管理（M642，配套 M558）
 *
 * 三甲流程：会诊申请 Table（申请科室/会诊科室/状态 badge）+ 新建会诊 Modal。
 * 权限码 consult:request。
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
import { useConsultationV2M642Store } from '@/store/consultationV2M642Store';
import {
  CONSULT_STATUS_META,
  type Consultation,
} from '@/services/api/consultationV2M642';

const DEPT_OPTIONS = ['心内科', '普外科', '麻醉科', '肾内科', '影像科', '神经内科', '呼吸科'].map((v) => ({
  value: v,
  label: v,
}));

interface CreateFormValues {
  patientId: string;
  requestingDept: string;
  consultingDept: string;
  reason: string;
}

export default function ConsultationV2M642Page() {
  usePageTitle('会诊管理');
  const { hasPermission } = usePermission();
  const canRequest = hasPermission('consult:request');

  const { items, loading, acting, error, demo, load, create } =
    useConsultationV2M642Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<Consultation> = [
    { title: '会诊号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '申请科室', dataIndex: 'requestingDept', width: 140 },
    { title: '会诊科室', dataIndex: 'consultingDept', width: 140 },
    { title: '会诊原因', dataIndex: 'reason', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: Consultation['status']) => (
        <Tag color={CONSULT_STATUS_META[v].color}>{CONSULT_STATUS_META[v].label}</Tag>
      ),
    },
    { title: '申请时间', dataIndex: 'requestedAt', width: 160, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '会诊医师', dataIndex: 'consultant', width: 120, render: (v: string | null) => v ?? '—' },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('会诊申请已提交');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="会诊管理（v2）"
      description="会诊申请列表 + 新建会诊"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canRequest && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 consult:request 权限" />
      )}

      <Card
        size="small"
        title={`会诊申请（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建会诊
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建会诊申请" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="requestingDept" label="申请科室" rules={[{ required: true, message: '必选' }]}>
              <Select style={{ width: 160 }} options={DEPT_OPTIONS} />
            </Form.Item>
            <Form.Item name="consultingDept" label="会诊科室" rules={[{ required: true, message: '必选' }]}>
              <Select style={{ width: 160 }} options={DEPT_OPTIONS} />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label="会诊原因" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
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
