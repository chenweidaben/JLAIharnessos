/**
 * 健澜科技 jlmedaios - M122-D 患者就诊后评价页
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 患者就诊后可对本次医疗服务作出真实评价，大字易读、操作简单。
 *
 * 三态：loading（提交中）/ error（失败提示可重试）/ empty（初始表单）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import { Alert, Button, Card, Input, Layout, Rate, Typography, message } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 提交评价的请求体 */
interface FeedbackPayload {
  patientId: string;
  visitId: string;
  doctorId?: string;
  deptCode?: string;
  rating: number;
  comment?: string;
}

export default function PatientFeedbackPage() {
  const [visitId, setVisitId] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  /** 提交评价：调用患者端反馈接口 */
  const onSubmit = async () => {
    setError('');
    if (!visitId.trim()) {
      setError('请填写就诊编号（Visit ID）');
      return;
    }
    if (!rating) {
      setError('请先选择您的总体评分');
      return;
    }
    setSubmitting(true);
    try {
      // 患者号由登录态在 BFF 侧兜底；这里传脱敏占位，实际由会话注入
      const payload: FeedbackPayload = {
        patientId: 'self',
        visitId: visitId.trim(),
        deptCode: deptCode.trim(),
        rating,
        comment: comment.trim(),
      };
      const resp = await fetch('/api/v1/patient/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '提交失败，请稍后重试');
        return;
      }
      setDone(true);
      message.success('感谢您的评价！');
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 成功态
  if (done) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <Card>
            <Title level={3}>评价已提交</Title>
            <Paragraph>感谢您对本次就诊的反馈，我们将持续改进医疗服务质量。</Paragraph>
            <Button type="primary" size="large" onClick={() => setDone(false)}>
              再评价一次
            </Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <Card>
          <Title level={3} style={{ fontSize: 26 }}>就诊后评价</Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            您的真实评价是我们改进服务的依据。请为本次就诊打分。
          </Paragraph>

          {/* error 态 */}
          {error && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16, fontSize: 16 }}
              message={error}
            />
          )}

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 18 }}>就诊编号</Text>
            <Input
              size="large"
              style={{ fontSize: 18, marginTop: 8 }}
              placeholder="请输入本次就诊编号"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 18 }}>就诊科室（选填）</Text>
            <Input
              size="large"
              style={{ fontSize: 18, marginTop: 8 }}
              placeholder="如 内科 / 外科"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 18 }}>总体满意度</Text>
            <div style={{ marginTop: 8 }}>
              <Rate
                style={{ fontSize: 36 }}
                value={rating}
                onChange={(v) => setRating(v)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 18 }}>意见建议（选填）</Text>
            <Input.TextArea
              size="large"
              rows={4}
              style={{ fontSize: 18, marginTop: 8 }}
              placeholder="请告诉我们哪里可以做得更好，例如候诊时间、服务态度等"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            loading={submitting}
            onClick={onSubmit}
          >
            {submitting ? '提交中…' : '提交评价'}
          </Button>
        </Card>
      </Content>
    </Layout>
  );
}
