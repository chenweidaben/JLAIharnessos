/**
 * 健澜科技 jlmedaios - 药房 AI 合理用药深度审核结果页（M144-C）「AI核心能力深化」
 *
 * 五维审核结论展示：药物相互作用 / 禁忌症 / 剂量合理性 / 特殊人群 / 重复用药；
 * 风险三级 high(红) / medium(橙) / low(蓝) 颜色区分；每条告警支持药师「标记误拦」
 * 反馈留痕，回流后用于误拦率持续下降。视觉遵循健澜深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Descriptions, Form, Input, InputNumber, Layout, Modal,
  Row, Select, Space, Statistic, Tag, Typography, message,
} from 'antd';
import { useState } from 'react';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF aiDrugReviewAggregator 对齐的最小类型 */
type RiskLevel = 'high' | 'medium' | 'low';
type Dimension = 'interaction' | 'contraindication' | 'dose' | 'specialPopulation' | 'duplicate';

interface Finding {
  id: string;
  dimension: Dimension;
  level: RiskLevel;
  drug: string;
  relatedDrug?: string;
  title: string;
  reason: string;
  suggestion: string;
}

interface ReviewResult {
  prescriptionId: string;
  findings: Finding[];
  overallRisk: RiskLevel | 'none';
  counts: { high: number; medium: number; low: number; total: number };
  summary: string;
}

/** 深海蓝 VI */
const DEEP_SEA = '#0A4D8C';

/** 风险级别 -> 颜色 / 文案 */
const RISK_META: Record<RiskLevel, { color: string; label: string; tag: string }> = {
  high: { color: '#cf1322', label: '高风险', tag: 'red' },
  medium: { color: '#d46b08', label: '需关注', tag: 'orange' },
  low: { color: '#1677ff', label: '提示', tag: 'blue' },
};

const DIM_LABEL: Record<Dimension, string> = {
  interaction: '药物相互作用',
  contraindication: '禁忌/过敏',
  dose: '剂量合理性',
  specialPopulation: '特殊人群',
  duplicate: '重复用药',
};

interface FormState {
  prescriptionId: string;
  patientAge: number | null;
  patientGender: 'male' | 'female';
  allergies: string;
  diseases: string;
  meds: string;
}

function splitLines(s: string): string[] {
  return s.split(/[\n,，;；]/).map((x) => x.trim()).filter(Boolean);
}

export default function AiDrugReviewResultPage() {
  const [form] = Form.useForm<FormState>();
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [feedbacks, setFeedbacks] = useState<string[]>([]);
  const [modal, setModal] = useState<{ open: boolean; finding: Finding | null }>({ open: false, finding: null });
  const [fbReason, setFbReason] = useState('');

  const runReview = async (values: FormState) => {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/ai/drug-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId: values.prescriptionId,
          patientAge: values.patientAge,
          patientGender: values.patientGender,
          allergies: splitLines(values.allergies),
          diseases: splitLines(values.diseases),
          currentMeds: splitLines(values.meds),
        }),
      });
      const json = await resp.json();
      if (json.code === 0 && json.data?.review) {
        setReview(json.data.review as ReviewResult);
        setFeedbacks([]);
      } else {
        message.error(json.message ?? '审核失败');
      }
    } catch {
      message.error('无法连接审核服务，请确认 BFF 已启动');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = () => {
    if (!modal.finding) return;
    // 留痕：本地标记 + 后续由 BFF 写入 medmuse.ai_drug_review.false_positive_feedbacks
    setFeedbacks((prev) => [...prev, modal.finding!.id]);
    message.success(`已记录误拦反馈：${modal.finding.title}（${fbReason || '药师标记'}）`);
    setModal({ open: false, finding: null });
    setFbReason('');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg, #073a6b 0%, #0A4D8C 55%, #1a6bb8 100%)',
      }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>AI 合理用药深度审核</Title>
        <Tag color="cyan">AI核心能力深化</Tag>
      </Header>

      <Content style={{ padding: 24, background: '#f0f5fa' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="处方与患者信息" size="small">
              <Form<FormState> form={form} layout="vertical" onFinish={runReview}
                initialValues={{ patientGender: 'male', patientAge: 60 }}>
                <Form.Item label="处方号" name="prescriptionId" rules={[{ required: true }]}>
                  <Input placeholder="如 RX-20261016-001" />
                </Form.Item>
                <Space.Compact style={{ display: 'flex' }}>
                  <Form.Item label="年龄" name="patientAge" style={{ flex: 1 }}>
                    <InputNumber min={0} max={120} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="性别" name="patientGender" style={{ flex: 1 }}>
                    <Select
                      options={[{ value: 'male', label: '男' }, { value: 'female', label: '女' }]}
                    />
                  </Form.Item>
                </Space.Compact>
                <Form.Item label="过敏史（换行/逗号分隔）" name="allergies">
                  <Input.TextArea rows={2} placeholder="如：青霉素" />
                </Form.Item>
                <Form.Item label="诊断/疾病（换行/逗号分隔）" name="diseases">
                  <Input.TextArea rows={2} placeholder="如：胃溃疡" />
                </Form.Item>
                <Form.Item label="本次用药（每行一个通用名）" name="meds" rules={[{ required: true }]}>
                  <Input.TextArea rows={4} placeholder={'如：\n华法林\n阿司匹林 5mg'} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block
                  style={{ background: DEEP_SEA }}>
                  开始 AI 深度审核
                </Button>
              </Form>
            </Card>
          </Col>

          <Col span={16}>
            {!review && (
              <Alert type="info" showIcon
                message="提交左侧处方后，此处展示五维审核结论"
                description="审核维度：药物相互作用 / 禁忌症 / 剂量合理性 / 特殊人群 / 重复用药；AI 结论仅供药师参考，最终放行由药师本人判断。" />
            )}

            {review && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card size="small"><Statistic title="高风险" value={review.counts.high}
                      valueStyle={{ color: RISK_META.high.color }} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small"><Statistic title="需关注" value={review.counts.medium}
                      valueStyle={{ color: RISK_META.medium.color }} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small"><Statistic title="提示" value={review.counts.low}
                      valueStyle={{ color: RISK_META.low.color }} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small"><Statistic title="告警总数" value={review.counts.total} /></Card>
                  </Col>
                </Row>

                <Card size="small" style={{ marginBottom: 16 }}>
                  <Descriptions size="small" column={2}>
                    <Descriptions.Item label="处方号">{review.prescriptionId}</Descriptions.Item>
                    <Descriptions.Item label="整体风险">
                      {review.overallRisk === 'none'
                        ? <Tag color="green">无风险</Tag>
                        : <Tag color={RISK_META[review.overallRisk as RiskLevel].tag}>
                            {RISK_META[review.overallRisk as RiskLevel].label}
                          </Tag>}
                    </Descriptions.Item>
                  </Descriptions>
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    <Text strong>结论：</Text>{review.summary}
                  </Paragraph>
                </Card>

                {review.findings.map((f) => {
                  const meta = RISK_META[f.level];
                  const fed = feedbacks.includes(f.id);
                  return (
                    <Card key={f.id} size="small" style={{ marginBottom: 12, borderLeft: `4px solid ${meta.color}` }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space direction="vertical" size={2}>
                          <Space>
                            <Tag color={meta.tag}>{meta.label}</Tag>
                            <Tag>{DIM_LABEL[f.dimension]}</Tag>
                            <Text strong>{f.title}</Text>
                          </Space>
                          <Text type="secondary">{f.reason}</Text>
                          <Text type="success">建议：{f.suggestion}</Text>
                          {fed && <Tag color="default">已标记误拦（反馈留痕）</Tag>}
                        </Space>
                        {!fed && (
                          <Button size="small" onClick={() => { setModal({ open: true, finding: f }); setFbReason(''); }}>
                            标记误拦
                          </Button>
                        )}
                      </Space>
                    </Card>
                  );
                })}
              </>
            )}
          </Col>
        </Row>
      </Content>

      <Modal title="误拦反馈留痕" open={modal.open} onOk={submitFeedback} onCancel={() => setModal({ open: false, finding: null })}>
        <Paragraph>
          将把「{modal.finding?.title}」标记为误拦，回流后用于规则库迭代、持续降低误拦率。
        </Paragraph>
        <Input.TextArea rows={3} placeholder="误拦原因（选填）" value={fbReason}
          onChange={(e) => setFbReason(e.target.value)} />
      </Modal>
    </Layout>
  );
}
