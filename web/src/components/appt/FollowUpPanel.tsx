/**
 * 健澜科技 jlmedaios - 随访计划面板组件（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, DatePicker, Form, Input, Modal, Space, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useApptStore } from '@/store/apptStore';
import type { FollowUpPlan } from '@/types/appt';

function genPlanNo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `FU${stamp}${rand}`;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'gold',
  completed: 'green',
  missed: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '待随访',
  completed: '已完成',
  missed: '已失访',
};

export default function FollowUpPanel() {
  const { plans, loading, load, createPlan, recordFollowUp, submitting } = useApptStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [recordTarget, setRecordTarget] = useState<FollowUpPlan | null>(null);
  const [createForm] = Form.useForm();
  const [recordForm] = Form.useForm();

  const onCreate = async (values: {
    patientId: string;
    scheduledDate: dayjs.Dayjs;
    content: string;
  }) => {
    const ok = await createPlan({
      planNo: genPlanNo(),
      patientId: values.patientId.trim(),
      scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
      content: values.content.trim(),
    });
    if (ok) {
      createForm.resetFields();
      setCreateOpen(false);
    }
  };

  const onRecord = async (values: { outcome: string; note?: string }) => {
    if (!recordTarget) return;
    const ok = await recordFollowUp(recordTarget.id, values.outcome.trim(), values.note?.trim());
    if (ok) {
      recordForm.resetFields();
      setRecordTarget(null);
    }
  };

  const columns = [
    { title: '计划号', dataIndex: 'planNo', key: 'planNo' },
    { title: '计划日期', dataIndex: 'scheduledDate', key: 'scheduledDate' },
    { title: '随访内容', dataIndex: 'content', key: 'content' },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: FollowUpPlan) => (
        <Tag color={STATUS_COLOR[row.status] ?? 'default'}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: FollowUpPlan) =>
        row.status === 'pending' ? (
          <Button type="link" size="small" onClick={() => setRecordTarget(row)}>
            记录随访
          </Button>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <Card
      title={`随访计划（${plans.length}）`}
      extra={
        <Space>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建随访计划
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷 新
          </Button>
        </Space>
      }
    >
      <Table<FollowUpPlan>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={plans}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="新建随访计划"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={submitting}
        onOk={() => createForm.submit()}
        okText="创 建"
        cancelText="取 消"
      >
        <Form form={createForm} layout="vertical" onFinish={onCreate}>
          <Form.Item label="患者ID" name="patientId" rules={[{ required: true, message: '请输入患者ID' }]}>
            <Input placeholder="clinical.patients.id" />
          </Form.Item>
          <Form.Item label="计划随访日期" name="scheduledDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="随访内容" name="content" rules={[{ required: true, message: '请输入随访内容' }]}>
            <Input.TextArea rows={3} placeholder="如：血压监测、用药依从性、复诊提醒" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`记录随访结果 · ${recordTarget?.planNo ?? ''}`}
        open={recordTarget !== null}
        onCancel={() => setRecordTarget(null)}
        confirmLoading={submitting}
        onOk={() => recordForm.submit()}
        okText="提交并完成"
        cancelText="取 消"
      >
        <Form form={recordForm} layout="vertical" onFinish={onRecord}>
          <Form.Item label="随访结果" name="outcome" rules={[{ required: true, message: '请输入随访结果' }]}>
            <Input placeholder="如：血压控制良好，继续当前用药" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
