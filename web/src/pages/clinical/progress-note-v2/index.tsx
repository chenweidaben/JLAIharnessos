/**
 * 健澜科技 jlmedaios - 病程记录（M648，配套 M575）
 *
 * 三甲流程：病程 Table（类型 badge / 内容 / 日期 / 医师）+ 新建 Modal。
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
import { useProgressNoteV2M648Store } from '@/store/progressNoteV2M648Store';
import {
  PROGRESS_TYPE_META,
  type ProgressNote,
} from '@/services/api/progressNoteV2M648';

interface CreateFormValues {
  patientId: string;
  noteType: ProgressNote['noteType'];
  content: string;
  doctor: string;
}

export default function ProgressNoteV2M648Page() {
  usePageTitle('病程记录');

  const { items, loading, acting, error, demo, load, create } =
    useProgressNoteV2M648Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<ProgressNote> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    {
      title: '类型',
      dataIndex: 'noteType',
      width: 140,
      render: (v: ProgressNote['noteType']) => (
        <Tag color={PROGRESS_TYPE_META[v].color}>{PROGRESS_TYPE_META[v].label}</Tag>
      ),
    },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '记录时间', dataIndex: 'notedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '医师', dataIndex: 'doctor', width: 110 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('病程记录已保存');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="病程记录（v2）"
      description="首次 / 日常 / 上级医师查房 / 交接班"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`病程记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建病程
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建病程记录" width={680} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="noteType" label="记录类型" rules={[{ required: true, message: '必选' }]}>
            <Select
              options={(Object.keys(PROGRESS_TYPE_META) as ProgressNote['noteType'][]).map((k) => ({
                value: k,
                label: PROGRESS_TYPE_META[k].label,
              }))}
            />
          </Form.Item>
          <Form.Item name="content" label="病程内容" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={5} />
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
