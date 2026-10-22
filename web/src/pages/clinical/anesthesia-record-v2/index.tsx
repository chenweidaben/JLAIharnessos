/**
 * 健澜科技 jlmedaios - 麻醉记录（M638，配套 M562）
 *
 * 三甲流程：记录 Table（手术号/麻醉医师/起止时间/术前评估/用药/生命体征摘要）
 * + 新建 Modal。权限码 anesthesia:manage。
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
import { useAnesthesiaRecordV2M638Store } from '@/store/anesthesiaRecordV2M638Store';
import type { AnesthesiaRecordItem } from '@/services/api/anesthesiaRecordV2M638';

interface CreateFormValues {
  surgeryId: string;
  patientId: string;
  anesthesiologist: string;
  preopAssessment: string;
}

export default function AnesthesiaRecordV2M638Page() {
  usePageTitle('麻醉记录');
  const { hasPermission } = usePermission();
  const canManage = hasPermission('anesthesia:manage');

  const { items, loading, acting, error, demo, load, create } =
    useAnesthesiaRecordV2M638Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<AnesthesiaRecordItem> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    { title: '手术号', dataIndex: 'surgeryId', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '麻醉医师', dataIndex: 'anesthesiologist', width: 120 },
    { title: '开始', dataIndex: 'startAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '结束', dataIndex: 'endAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '术前评估', dataIndex: 'preopAssessment', ellipsis: true },
    { title: '术中用药', dataIndex: 'medications', ellipsis: true },
    { title: '生命体征', dataIndex: 'vitalsSummary', ellipsis: true },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('麻醉记录已创建');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="手术麻醉记录（v2）"
      description="麻醉记录单列表 + 新建（术前评估/术中用药/生命体征）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canManage && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 anesthesia:manage 权限" />
      )}

      <Card
        size="small"
        title={`麻醉记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建记录
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建麻醉记录" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="surgeryId" label="手术号" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="anesthesiologist" label="麻醉医师" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="preopAssessment" label="术前评估">
            <Input.TextArea rows={2} />
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
