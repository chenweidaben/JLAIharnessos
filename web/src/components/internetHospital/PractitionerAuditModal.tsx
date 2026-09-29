/**
 * 健澜科技 jlmedaios - 医护线上资质审核 Modal（M3-J）
 *
 * 通过 / 驳回（驳回必须填写理由）。审核动作本人不可审核本人，
 * 由路由层 + 页面层共同保证；这里只做表单与提交。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { Form, Input, Modal, Radio } from 'antd';
import { useEffect } from 'react';
import type { InternetPractitionerView } from '@/types/internetHospital';

interface Props {
  open: boolean;
  practitioner: InternetPractitionerView | null;
  auditing: boolean;
  onClose: () => void;
  onSubmit: (decision: 'approved' | 'rejected', reason?: string) => Promise<void>;
}

export default function PractitionerAuditModal({
  open,
  practitioner,
  auditing,
  onClose,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();
  const decision = Form.useWatch('decision', form) as 'approved' | 'rejected' | undefined;

  useEffect(() => {
    if (open) form.setFieldsValue({ decision: 'approved', reason: '' });
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.decision, values.reason);
    } catch {
      // 表单校验失败（如驳回未填理由）：字段错误已展示，无需进一步处理
    }
  };

  return (
    <Modal
      open={open}
      title="审核线上执业资质"
      confirmLoading={auditing}
      onOk={handleOk}
      onCancel={onClose}
      okText="提交审核"
      cancelText="取 消"
      destroyOnClose
    >
      {practitioner && (
        <div className="mb-3 text-sm text-gray-600">
          <div>类型：{practitioner.practitionerType}</div>
          <div>执业范围：{practitioner.practiceScope ?? '—'}</div>
          <div>执业年限：{practitioner.practiceYears ?? '—'}</div>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item name="decision" label="审核结论" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio.Button value="approved">通过</Radio.Button>
            <Radio.Button value="rejected">驳回</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {decision === 'rejected' && (
          <Form.Item
            name="reason"
            label="驳回理由"
            rules={[{ required: true, message: '驳回必须填写理由' }]}
          >
            <Input.TextArea rows={3} placeholder="请说明驳回原因，便于医护补正" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
