/**
 * 健澜科技 jlmedaios - 入院记录（M647，配套 M574）
 *
 * 三甲流程：入院记录 Table（病区/主诉/初步诊断/入院医师/入院时间）+ 新建 Modal
 * （主诉 / 现病史 / 既往史 / 体格检查）。
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
import { useAdmissionRecordV2M647Store } from '@/store/admissionRecordV2M647Store';
import type { AdmissionRecord } from '@/services/api/admissionRecordV2M647';

interface CreateFormValues {
  patientId: string;
  ward: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  admittingDiagnosis: string;
  admittingDoctor: string;
}

export default function AdmissionRecordV2M647Page() {
  usePageTitle('入院记录');

  const { items, loading, acting, error, demo, load, create } =
    useAdmissionRecordV2M647Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<AdmissionRecord> = [
    { title: '记录号', dataIndex: 'id', width: 100 },
    { title: '病区', dataIndex: 'ward', width: 160 },
    { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
    { title: '初步诊断', dataIndex: 'admittingDiagnosis', width: 200, ellipsis: true },
    { title: '入院医师', dataIndex: 'admittingDoctor', width: 110 },
    { title: '入院时间', dataIndex: 'admittedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('入院记录已保存');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="入院记录（v2）"
      description="主诉 / 现病史 / 既往史 / 体格检查"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card
        size="small"
        title={`入院记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建入院记录
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建入院记录" width={720} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="ward" label="病区" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 220 }} />
            </Form.Item>
          </Space>
          <Form.Item name="chiefComplaint" label="主诉" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="presentIllness" label="现病史" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="pastHistory" label="既往史">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="physicalExam" label="体格检查" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="admittingDiagnosis" label="初步诊断" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 320 }} />
            </Form.Item>
            <Form.Item name="admittingDoctor" label="入院医师" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 200 }} />
            </Form.Item>
          </Space>
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
