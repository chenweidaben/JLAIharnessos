/**
 * 健澜科技 jlmedaios - 预问诊病史表单（M3-P）
 *
 * 结构化采集主诉、现病史、既往史、用药、过敏史，生成报告供医生参考。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Card, Form, Input, Button, Space, Typography, Alert, Checkbox,
} from 'antd';
import {
  FileTextOutlined,
} from '@ant-design/icons';
import { useSmartTriageStore } from '@/store/smartTriageStore';
import type { PreliminaryHistoryInput } from '@/types/smartTriage';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const COMMON_ACCOMPANY = [
  '发热', '咳嗽', '恶心', '呕吐', '乏力', '头晕', '胸痛', '腹泻',
];

interface Props {
  triageSessionId?: string | null;
  targetDepartment?: string | null;
  onDone?: () => void;
}

export function PreliminaryForm({ triageSessionId, targetDepartment, onDone }: Props) {
  const { submitting, currentReport, submitPreliminary } = useSmartTriageStore();
  const [form] = Form.useForm();
  const [accompanying, setAccompanying] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      const values = await form.validateFields();
      const history: PreliminaryHistoryInput = {
        chiefComplaint: values.chiefComplaint,
        presentIllness: values.presentIllness,
        pastHistory: values.pastHistory,
        medications: values.medications,
        allergies: values.allergies,
        onsetTime: values.onsetTime,
        accompanyingSymptoms: accompanying,
      };
      await submitPreliminary({
        triageSessionId: triageSessionId ?? null,
        targetDepartment: targetDepartment ?? null,
        history,
      });
      onDone?.();
    } catch (err) {
      if (err instanceof Error && err.message) setError(err.message);
    }
  };

  if (currentReport) {
    return (
      <Alert
        type="success"
        showIcon
        data-testid="preliminary-done"
        message="预问诊报告已生成"
        description={
          <Space direction="vertical">
            <Text>目标科室：{currentReport.targetDepartment ?? '未指定'}</Text>
            <Paragraph
              style={{ whiteSpace: 'pre-wrap', margin: 0, maxHeight: 200, overflow: 'auto' }}
            >
              {currentReport.reportText}
            </Paragraph>
          </Space>
        }
      />
    );
  }

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>预问诊</span>
        </Space>
      }
    >
      <Form form={form} layout="vertical" data-testid="preliminary-form">
        <Form.Item
          label="主诉"
          name="chiefComplaint"
          rules={[{ required: true, message: '请填写主诉' }]}
        >
          <Input data-testid="f-chief" placeholder="例如：头痛 3 天" />
        </Form.Item>

        <Form.Item label="起病时间" name="onsetTime">
          <Input data-testid="f-onset" placeholder="例如：3 天前" />
        </Form.Item>

        <Form.Item
          label="现病史"
          name="presentIllness"
          rules={[{ required: true, message: '请描述现病史' }]}
        >
          <TextArea
            data-testid="f-present"
            rows={4}
            placeholder="请描述症状的发生、发展、变化情况..."
          />
        </Form.Item>

        <Form.Item label="伴随症状">
          <Checkbox.Group
            data-testid="f-accompany"
            options={COMMON_ACCOMPANY}
            value={accompanying}
            onChange={(v) => setAccompanying(v as string[])}
          />
        </Form.Item>

        <Form.Item label="既往史" name="pastHistory">
          <TextArea data-testid="f-past" rows={2} placeholder="既往疾病、手术史..." />
        </Form.Item>

        <Form.Item label="当前用药" name="medications">
          <TextArea data-testid="f-meds" rows={2} placeholder="正在使用的药物..." />
        </Form.Item>

        <Form.Item label="过敏史" name="allergies">
          <Input data-testid="f-allergy" placeholder="药物或食物过敏史..." />
        </Form.Item>

        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 12 }} showIcon />
        )}

        <Button
          type="primary"
          data-testid="preliminary-submit"
          loading={submitting}
          onClick={handleSubmit}
          block
        >
          生成预问诊报告
        </Button>
      </Form>
    </Card>
  );
}

export default PreliminaryForm;
