/**
 * 健澜科技 jlmedaios - 护理记录单（M644，配套 M571）
 *
 * 三甲流程：护理记录 Table（类型/生命体征/护理措施）+ 新增 Modal。
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
import { useNursingRecordV2M644Store } from '@/store/nursingRecordV2M644Store';
import type { NursingRecordItem } from '@/services/api/nursingRecordV2M644';

const RECORD_TYPE_META: Record<NursingRecordItem['recordType'], { label: string; color: string }> = {
  vitals: { label: '生命体征', color: 'blue' },
  measure: { label: '护理措施', color: 'orange' },
  note: { label: '病情记录', color: 'green' },
};

interface CreateFormValues {
  patientId: string;
  recordType: NursingRecordItem['recordType'];
  vitals?: string;
  measure: string;
  nurse: string;
}

export default function NursingRecordV2M644Page() {
  usePageTitle('护理记录单');
  const { items, loading, acting, error, demo, load, create } =
    useNursingRecordV2M644Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<NursingRecordItem> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    {
      title: '类型',
      dataIndex: 'recordType',
      width: 110,
      render: (v: NursingRecordItem['recordType']) => (
        <Tag color={RECORD_TYPE_META[v].color}>{RECORD_TYPE_META[v].label}</Tag>
      ),
    },
    { title: '生命体征', dataIndex: 'vitals', width: 280, render: (v?: string) => v ?? '—' },
    { title: '护理措施 / 病情', dataIndex: 'measure', ellipsis: true },
    { title: '记录时间', dataIndex: 'recordedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '护士', dataIndex: 'nurse', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('护理记录已保存');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="护理记录单（v2）"
      description="生命体征 / 护理措施 / 病情记录"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`护理记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新增记录
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新增护理记录" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="recordType" label="记录类型" rules={[{ required: true, message: '必选' }]}>
            <Select
              options={(Object.keys(RECORD_TYPE_META) as NursingRecordItem['recordType'][]).map((k) => ({
                value: k,
                label: RECORD_TYPE_META[k].label,
              }))}
            />
          </Form.Item>
          <Form.Item name="vitals" label="生命体征（如 T/P/R/BP/SpO2）">
            <Input />
          </Form.Item>
          <Form.Item name="measure" label="护理措施 / 病情记录" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="nurse" label="记录护士" rules={[{ required: true, message: '必填' }]}>
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
