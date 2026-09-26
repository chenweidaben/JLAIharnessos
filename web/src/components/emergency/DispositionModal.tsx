/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 终末转归录入（POST /emergency/dispositions/:visitId）。
 */
import { useEffect } from 'react';
import {
  App as AntdApp,
  Form,
  Input,
  Modal,
  Select,
} from 'antd';

import { useEmergencyStore } from '@/store/emergencyStore';
import type { DispositionCode, EmergencyQueueItem } from '@/types/emergency';
import { DISPOSITION_META } from './constants';

export default function DispositionModal({
  item,
  onClose,
}: {
  item: EmergencyQueueItem | null;
  onClose: () => void;
}) {
  const { message } = AntdApp.useApp();
  const { recordDisposition, acting } = useEmergencyStore();
  const [form] = Form.useForm();

  useEffect(() => {
    if (item) {
      form.resetFields();
      form.setFieldsValue({ disposition: 'admitted' });
    }
  }, [item, form]);

  const handleOk = async () => {
    if (!item) return;
    const v = await form.validateFields();
    try {
      await recordDisposition(item.visitId, {
        disposition: v.disposition as DispositionCode,
        destination: v.destination || null,
        wardId: v.wardId || null,
        bedId: v.bedId || null,
        remark: v.remark || null,
      });
      message.success('转归已记录');
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '转归记录失败');
    }
  };

  return (
    <Modal
      open={!!item}
      title={`记录转归 · ${item?.triageNo ?? ''} ${item?.patientName ?? ''}`}
      onOk={handleOk}
      confirmLoading={acting}
      onCancel={onClose}
      okText="确认转归"
    >
      <Form form={form} layout="vertical" className="mt-2">
        <Form.Item name="disposition" label="转归" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(DISPOSITION_META) as DispositionCode[]).map((k) => ({
              value: k,
              label: DISPOSITION_META[k].label,
            }))}
          />
        </Form.Item>
        <Form.Item name="destination" label="去向">
          <Input placeholder="如：CCU、心内科病房、回家" />
        </Form.Item>
        <Form.Item name="wardId" label="病区 ID（入院时可填）">
          <Input />
        </Form.Item>
        <Form.Item name="bedId" label="床位 ID（可填）">
          <Input />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
