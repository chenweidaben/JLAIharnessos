/**
 * 健澜科技 jlmedaios - 满意度评价表单（M3-O）
 *
 * 患者对就诊/问诊进行多维度星级评分（1-5）+ 评论。
 * 一次就诊/问诊仅可评价一次；提交后给出明确结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  message,
} from 'antd';
import { StarFilled } from '@ant-design/icons';
import { useSatisfactionStore } from '@/store/satisfactionStore';
import {
  SATISFACTION_DIMENSIONS,
  type SatisfactionSource,
  type SurveyScoresInput,
} from '@/types/satisfaction';

interface SurveyFormProps {
  patientId: string;
  visitId?: string | null;
  consultId?: string | null;
  sourceType?: SatisfactionSource;
  asStaff?: boolean;
}

interface FormValues extends Record<string, unknown> {
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment?: string;
}

const STAR_LABELS = ['很不满意', '不满意', '一般', '满意', '非常满意'];

function StarRating({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <Space>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarFilled
          key={n}
          role="radio"
          aria-checked={value === n}
          tabIndex={0}
          data-testid={`star-${n}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            fontSize: 22,
            cursor: 'pointer',
            color: n <= (hover || value || 0) ? '#faad14' : '#d9d9d9',
          }}
        />
      ))}
      <Typography.Text type="secondary">
        {STAR_LABELS[(hover || value || 1) - 1]}
      </Typography.Text>
    </Space>
  );
}

export default function SurveyForm({
  patientId,
  visitId,
  consultId,
  sourceType,
  asStaff = false,
}: SurveyFormProps) {
  const [form] = Form.useForm<FormValues>();
  const { submitMy, submitStaff, submitting } = useSatisfactionStore();
  const [done, setDone] = useState(false);

  const onFinish = async (values: FormValues) => {
    const payload: SurveyScoresInput = {
      patientId,
      visitId: visitId ?? null,
      consultId: consultId ?? null,
      sourceType,
      overallScore: values.overallScore,
      medicalScore: values.medicalScore,
      serviceScore: values.serviceScore,
      environmentScore: values.environmentScore,
      processScore: values.processScore,
      waitScore: values.waitScore,
      comment: values.comment ?? null,
    };
    try {
      const r = asStaff ? await submitStaff(payload) : await submitMy(payload);
      if (r.created) {
        message.success('评价提交成功，感谢您的反馈');
      } else {
        message.info('该就诊/问诊已评价，无需重复提交');
      }
      setDone(true);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '评价提交失败');
    }
  };

  if (done) {
    return (
      <Card data-testid="survey-done">
        <Typography.Text strong>评价已完成，感谢您的反馈。</Typography.Text>
      </Card>
    );
  }

  return (
    <Card
      title={asStaff ? '医护代录入满意度评价' : '满意度评价'}
      data-testid="survey-form"
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={(v) => void onFinish(v)}
        requiredMark={false}
      >
        {SATISFACTION_DIMENSIONS.map((dim) => (
          <Form.Item
            key={dim.key}
            name={dim.key}
            label={dim.label}
            rules={[{ required: true, message: `请为${dim.label}评分` }]}
          >
            <StarRating
              value={form.getFieldValue(dim.key)}
              onChange={(v) => form.setFieldValue(dim.key, v)}
            />
          </Form.Item>
        ))}
        <Form.Item name="comment" label="意见与建议（选填）">
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="请留下您的宝贵意见，我们将持续改进"
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              data-testid="survey-submit"
            >
              提交评价
            </Button>
            <Button htmlType="button" onClick={() => form.resetFields()}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
