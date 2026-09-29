/**
 * 健澜科技 jlmedaios - 新建预约表单组件（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useApptStore } from '@/store/apptStore';

function genNo(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${stamp}${rand}`;
}

export default function ApptCreateForm() {
  const { createAppt, submitting } = useApptStore();
  const [form] = Form.useForm();

  const onFinish = async (values: {
    patientId: string;
    scheduledAt: dayjs.Dayjs;
    department: string;
    purpose: string;
  }) => {
    const ok = await createAppt({
      appointmentNo: genNo('APPT'),
      patientId: values.patientId.trim(),
      scheduledAt: values.scheduledAt.toISOString(),
      department: values.department,
      purpose: values.purpose.trim(),
    });
    if (ok) form.resetFields();
  };

  return (
    <Card className="mb-4" title="新建预约">
      <Form
        form={form}
        layout="inline"
        onFinish={onFinish}
        initialValues={{ department: '门诊' }}
      >
        <Form.Item
          label="患者ID"
          name="patientId"
          rules={[{ required: true, message: '请输入患者ID' }]}
        >
          <Input placeholder="clinical.patients.id" style={{ width: 260 }} />
        </Form.Item>
        <Form.Item
          label="预约时间"
          name="scheduledAt"
          rules={[{ required: true, message: '请选择预约时间' }]}
        >
          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
        </Form.Item>
        <Form.Item label="科室" name="department">
          <Select style={{ width: 130 }} options={[
            { value: '门诊', label: '门诊' },
            { value: '心血管内科', label: '心血管内科' },
            { value: '呼吸内科', label: '呼吸内科' },
            { value: '内分泌科', label: '内分泌科' },
          ]} />
        </Form.Item>
        <Form.Item
          label="就诊目的"
          name="purpose"
          rules={[{ required: true, message: '请输入就诊目的' }]}
        >
          <Input placeholder="如：术后复查" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            创建预约
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
