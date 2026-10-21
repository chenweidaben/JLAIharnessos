/**
 * 健澜科技 jlmedaios - 随访计划（M619，P12 患者侧深度）
 *
 * 三甲流程：随访计划 Table（疾病/项目/计划日期/频次/责任医生/状态 badge）
 * → 新建 Modal。权限码 followup:manage。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
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
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useFollowupPlansM619Store } from '@/store/followupPlansM619Store';
import {
  FOLLOWUP_STATUS_META,
  type FollowupPlan,
} from '@/services/api/followupPlansM619';

interface CreateFormValues {
  disease: string;
  item: string;
  planDate: Dayjs;
  frequency: string;
  owner: string;
}

export default function FollowupPlansM619Page() {
  usePageTitle('随访计划');
  const { hasPermission } = usePermission();
  const canManage = hasPermission('followup:manage');

  const { patientId, items, loading, acting, error, demo, load, create } =
    useFollowupPlansM619Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const columns: ColumnsType<FollowupPlan> = [
    { title: '计划编号', dataIndex: 'id', width: 100 },
    { title: '病种', dataIndex: 'disease', width: 120 },
    { title: '随访项目', dataIndex: 'item', width: 220 },
    { title: '计划日期', dataIndex: 'planDate', width: 130, render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '频次', dataIndex: 'frequency', width: 140 },
    { title: '责任人', dataIndex: 'owner', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: FollowupPlan['status']) => (
        <Tag color={FOLLOWUP_STATUS_META[v].color}>{FOLLOWUP_STATUS_META[v].label}</Tag>
      ),
    },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create({
      patientId,
      disease: values.disease,
      item: values.item,
      planDate: values.planDate.format('YYYY-MM-DD'),
      frequency: values.frequency,
      owner: values.owner,
    });
    if (ok) {
      message.success('随访计划已创建');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="随访计划"
      description="患者随访计划列表与新建（类型/频次/状态）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canManage && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 followup:manage 权限" />
      )}

      <Card
        size="small"
        title={`随访计划（${items.length}）· 患者 ${patientId}`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建随访
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建随访计划" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="disease" label="病种" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如 高血压" />
          </Form.Item>
          <Form.Item name="item" label="随访项目" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如 家庭血压记录随访" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="planDate" label="计划日期" rules={[{ required: true, message: '必填' }]}>
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="frequency" label="频次" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 160 }} placeholder="如 每周 1 次" />
            </Form.Item>
          </Space>
          <Form.Item name="owner" label="责任人" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如 王医师" />
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
