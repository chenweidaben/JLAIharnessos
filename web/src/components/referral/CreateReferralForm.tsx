/**
 * 健澜科技 jlmedaios - 发起转诊表单（M3-R）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Form, Input, Radio, Select } from 'antd';
import { useReferralStore } from '@/store/referralStore';
import type { CreateReferralInput } from '@/types/referral';

const DOC_TYPES = [
  { label: 'DICOM 影像', value: 'dicom' },
  { label: '病案首页', value: 'front_page' },
  { label: '诊断证明书', value: 'diagnosis' },
  { label: '检验结果', value: 'lab' },
  { label: '检查报告', value: 'exam' },
  { label: '其他', value: 'other' },
];

export default function CreateReferralForm() {
  const [form] = Form.useForm<CreateReferralInput>();
  const { submitting, createReferral } = useReferralStore();

  const onFinish = async (values: CreateReferralInput) => {
    const ok = await createReferral(values);
    if (ok) form.resetFields();
  };

  return (
    <Card className="mb-4" title="发起转诊登记">
      <Form<CreateReferralInput>
        form={form}
        layout="vertical"
        initialValues={{ direction: 'incoming', urgency: 'normal' }}
        onFinish={(v) => void onFinish(v)}
      >
        <Form.Item label="转诊方向" name="direction">
          <Radio.Group
            options={[
              { label: '转入（院外 → 本院）', value: 'incoming' },
              { label: '转出（本院 → 院外）', value: 'outgoing' },
            ]}
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Form.Item
            label="患者姓名"
            name="patientName"
            rules={[{ required: true, message: '请输入患者姓名' }]}
          >
            <Input placeholder="院外患者姓名" />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select
              allowClear
              options={[
                { label: '男', value: '男' },
                { label: '女', value: '女' },
                { label: '未知', value: '未知' },
              ]}
            />
          </Form.Item>
          <Form.Item label="源机构" name="sourceOrg" rules={[{ required: true }]}>
            <Input placeholder="如 某某县人民医院" />
          </Form.Item>
          <Form.Item label="源科室" name="sourceDept">
            <Input placeholder="如 内科" />
          </Form.Item>
          <Form.Item label="目标机构" name="targetOrg" rules={[{ required: true }]}>
            <Input placeholder="如 本院" />
          </Form.Item>
          <Form.Item label="目标科室" name="targetDept">
            <Input placeholder="如 心血管内科" />
          </Form.Item>
        </div>

        <Form.Item label="紧急程度" name="urgency">
          <Radio.Group
            options={[
              { label: '普通', value: 'normal' },
              { label: '急诊', value: 'urgent' },
            ]}
          />
        </Form.Item>

        <Form.Item label="转诊原因" name="reason" rules={[{ required: true }]}>
          <Input.TextArea rows={2} placeholder="病情摘要与转诊原因" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={submitting}>
          登记转诊单
        </Button>
      </Form>
    </Card>
  );
}

export { DOC_TYPES };
