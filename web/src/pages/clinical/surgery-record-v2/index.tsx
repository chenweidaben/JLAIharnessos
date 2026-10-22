/**
 * 健澜科技 jlmedaios - 手术记录（M653，配套 M580）
 *
 * 三甲流程：手术 Table（术者/麻醉方式/切口等级 badge/起止时间/手术经过）+ 新建 Modal。
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
import { useSurgeryRecordV2M653Store } from '@/store/surgeryRecordV2M653Store';
import {
  INCISION_META,
  type IncisionClass,
  type SurgeryRecord,
} from '@/services/api/surgeryRecordV2M653';

interface CreateFormValues {
  patientId: string;
  surgeryName: string;
  surgeon: string;
  assistant?: string;
  anesthesiaType: string;
  incisionClass: IncisionClass;
  operativeNote: string;
}

export default function SurgeryRecordV2M653Page() {
  usePageTitle('手术记录');

  const { items, loading, acting, error, demo, load, create } =
    useSurgeryRecordV2M653Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<SurgeryRecord> = [
    { title: '手术号', dataIndex: 'id', width: 100 },
    { title: '手术名称', dataIndex: 'surgeryName', width: 220, ellipsis: true },
    { title: '术者', dataIndex: 'surgeon', width: 110 },
    { title: '助手', dataIndex: 'assistant', width: 110, render: (v?: string) => v ?? '—' },
    { title: '麻醉方式', dataIndex: 'anesthesiaType', width: 200, ellipsis: true },
    {
      title: '切口等级',
      dataIndex: 'incisionClass',
      width: 180,
      render: (v: IncisionClass) => <Tag color={INCISION_META[v].color}>{INCISION_META[v].label}</Tag>,
    },
    { title: '开始', dataIndex: 'startedAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '结束', dataIndex: 'finishedAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '手术经过', dataIndex: 'operativeNote', ellipsis: true },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('手术记录已保存');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="手术记录（v2）"
      description="手术名称 / 术者 / 麻醉方式 / 切口等级"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`手术记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建手术记录
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建手术记录" width={680} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="surgeryName" label="手术名称" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="surgeon" label="术者" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="assistant" label="助手">
              <Input style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Form.Item name="anesthesiaType" label="麻醉方式" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="incisionClass" label="切口等级" rules={[{ required: true, message: '必选' }]}>
            <Select
              options={(Object.keys(INCISION_META) as IncisionClass[]).map((k) => ({
                value: k,
                label: INCISION_META[k].label,
              }))}
            />
          </Form.Item>
          <Form.Item name="operativeNote" label="手术经过" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={4} />
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
