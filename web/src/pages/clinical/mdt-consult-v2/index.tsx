/**
 * 健澜科技 jlmedaios - MDT 多学科会诊（M651，配套 M578）
 *
 * 三甲流程：MDT Table（申请科室/参与科室 tags/主题/状态/结论）+ 新建 Modal。
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
import { useMdtConsultV2M651Store } from '@/store/mdtConsultV2M651Store';
import {
  MDT_STATUS_META,
  type MdtConsult,
} from '@/services/api/mdtConsultV2M651';

const DEPT_OPTIONS = [
  '肿瘤科', '放疗科', '胸外科', '影像科', '消化科', '肝胆外科', '介入科', '心内科', '神经内科',
].map((v) => ({ value: v, label: v }));

interface CreateFormValues {
  patientId: string;
  requestingDept: string;
  participantDepts: string[];
  topic: string;
  chair: string;
}

export default function MdtConsultV2M651Page() {
  usePageTitle('MDT 多学科会诊');

  const { items, loading, acting, error, demo, load, create } =
    useMdtConsultV2M651Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<MdtConsult> = [
    { title: 'MDT 号', dataIndex: 'id', width: 110 },
    { title: '申请科室', dataIndex: 'requestingDept', width: 130 },
    {
      title: '参与科室',
      dataIndex: 'participantDepts',
      width: 260,
      render: (depts: string[]) => (
        <Space size={[4, 4]} wrap>
          {depts.map((d) => (
            <Tag key={d} color="blue">{d}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '议题', dataIndex: 'topic', ellipsis: true },
    { title: '结论', dataIndex: 'conclusion', ellipsis: true, render: (v: string) => v || '—' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: MdtConsult['status']) => <Tag color={MDT_STATUS_META[v].color}>{MDT_STATUS_META[v].label}</Tag>,
    },
    { title: '排期时间', dataIndex: 'scheduledAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '主持', dataIndex: 'chair', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('MDT 会诊已排期');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="MDT 多学科会诊（v2）"
      description="申请科室 / 参与科室 / 会诊结论"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`MDT 会诊（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建 MDT
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建 MDT 多学科会诊" width={680} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="requestingDept" label="申请科室" rules={[{ required: true, message: '必选' }]}>
            <Select options={DEPT_OPTIONS} />
          </Form.Item>
          <Form.Item name="participantDepts" label="参与科室（多选）" rules={[{ required: true, message: '必选' }]}>
            <Select mode="multiple" options={DEPT_OPTIONS} />
          </Form.Item>
          <Form.Item name="topic" label="会诊议题" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="chair" label="主持人" rules={[{ required: true, message: '必填' }]}>
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
