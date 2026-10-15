/**
 * 健澜科技 jlmedaios - 用药合理性深度审核报告（M126-D）
 *
 * AI能力升级：录入处方药品 / 患者信息 / 在用药物 / 过敏史后，
 * 调用 POST /api/v1/assistant/prescription/deep-review，展示五维审核报告：
 *  - 药物相互作用 / 禁忌症 / 剂量合理性 / 重复用药 / 特殊人群。
 *
 * 三态完备：loading（Spin）、error（Alert + 重试）、empty（未审核 / 无数据）。
 * 视觉：深海蓝 VI（主色 #0B3D6B，辅底 #E8F0F8）。
 *
 * 定位：AI 辅助审核结论，不拦截处方；最终用药决定由医师/药师作出。
 * 数据安全：全程不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Form, Input, InputNumber, Layout, List, Row, Spin, Switch, Tag, Typography, message,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA = '#0B3D6B';
const DEEP_SEA_BG = '#E8F0F8';

type RiskLevel = 'info' | 'warning' | 'critical';

interface InteractionIssue {
  rule: string; drugA: string; drugB: string; level: RiskLevel; reason: string;
  suggestion: string; withCurrentMed?: boolean;
}
interface ContraindicationIssue {
  drug: string; level: RiskLevel; factor: string; reason: string; suggestion: string;
}
interface DoseIssue {
  drug: string; level: RiskLevel; kind: string; actual: number; limit: number; suggestion: string;
}
interface DuplicateIssue {
  level: RiskLevel; drugA: string; drugB: string; category: string; reason: string;
  suggestion: string; withCurrentMed?: boolean;
}
interface SpecialPopulationIssue {
  drug: string; level: RiskLevel; population: string; reason: string; suggestion: string;
}

interface ReviewReport {
  interactions: InteractionIssue[];
  contraindications: ContraindicationIssue[];
  doseIssues: DoseIssue[];
  duplicateTherapy: DuplicateIssue[];
  specialPopulation: SpecialPopulationIssue[];
  overallRisk: RiskLevel;
  summary: string;
  counts: { critical: number; warning: number; total: number };
}

const LEVEL_TAG: Record<RiskLevel, { color: string; label: string }> = {
  critical: { color: 'red', label: '高风险' },
  warning: { color: 'orange', label: '需核对' },
  info: { color: 'green', label: '安全' },
};

interface FormState {
  drugsText: string;
  diagnosesText: string;
  age: number | null;
  weightKg: number | null;
  pregnant: boolean;
  breastfeeding: boolean;
  renalImpaired: boolean;
  currentMedsText: string;
  allergiesText: string;
}

const splitLines = (s: string): string[] =>
  s.split(/[\n,，;；]/).map((x) => x.trim()).filter(Boolean);

/** 调用 BFF：POST /api/v1/assistant/prescription/deep-review（baseURL 已含前缀） */
function runDeepReview(payload: Record<string, unknown>): Promise<ReviewReport> {
  return post<ReviewReport>('/assistant/prescription/deep-review', payload);
}

export default function DeepReviewPage() {
  const [form, setForm] = useState<FormState>({
    drugsText: '华法林片\n阿司匹林肠溶片',
    diagnosesText: '',
    age: 65,
    weightKg: 60,
    pregnant: false,
    breastfeeding: false,
    renalImpaired: false,
    currentMedsText: '',
    allergiesText: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReviewReport | null>(null);
  const [reviewed, setReviewed] = useState(false);

  const submit = async () => {
    const drugs = splitLines(form.drugsText).map((name) => ({ name }));
    if (drugs.length === 0) {
      message.warning('请至少录入一个处方药品');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await runDeepReview({
        prescription: { drugs, diagnoses: splitLines(form.diagnosesText) },
        patientInfo: {
          age: form.age,
          weightKg: form.weightKg,
          pregnant: form.pregnant,
          breastfeeding: form.breastfeeding,
          renalImpaired: form.renalImpaired,
        },
        currentMedications: splitLines(form.currentMedsText),
        allergies: splitLines(form.allergiesText),
      });
      setData(res);
      setReviewed(true);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '审核失败');
    } finally {
      setLoading(false);
    }
  };

  const risk = data ? LEVEL_TAG[data.overallRisk] : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>用药合理性深度审核</Title>
        <Tag color="#E8F0F8" style={{ marginLeft: 12 }}>AI能力升级 · M126-D</Tag>
      </Header>
      <Content style={{ padding: 24, background: DEEP_SEA_BG }}>
        <Row gutter={16}>
          {/* 录入区 */}
          <Col span={8}>
            <Card title="审核录入" size="small" style={{ marginBottom: 16 }}>
              <Form layout="vertical" size="small">
                <Form.Item label="处方药品（每行一个通用名）" required>
                  <Input.TextArea rows={3} value={form.drugsText}
                    onChange={(e) => setForm({ ...form, drugsText: e.target.value })} />
                </Form.Item>
                <Form.Item label="诊断（逗号分隔）">
                  <Input value={form.diagnosesText}
                    onChange={(e) => setForm({ ...form, diagnosesText: e.target.value })} />
                </Form.Item>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item label="年龄">
                      <InputNumber style={{ width: '100%' }} value={form.age}
                        onChange={(v) => setForm({ ...form, age: v ?? null })} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="体重(kg)">
                      <InputNumber style={{ width: '100%' }} value={form.weightKg}
                        onChange={(v) => setForm({ ...form, weightKg: v ?? null })} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="妊娠">
                  <Switch checked={form.pregnant}
                    onChange={(v) => setForm({ ...form, pregnant: v })} />
                </Form.Item>
                <Form.Item label="肾功能不全">
                  <Switch checked={form.renalImpaired}
                    onChange={(v) => setForm({ ...form, renalImpaired: v })} />
                </Form.Item>
                <Form.Item label="当前在用药物（逗号分隔）">
                  <Input value={form.currentMedsText}
                    onChange={(e) => setForm({ ...form, currentMedsText: e.target.value })} />
                </Form.Item>
                <Form.Item label="过敏史（逗号分隔）">
                  <Input value={form.allergiesText}
                    onChange={(e) => setForm({ ...form, allergiesText: e.target.value })} />
                </Form.Item>
                <Button type="primary" icon={<ThunderboltOutlined />} block loading={loading}
                  onClick={() => void submit()}>
                  开始深度审核
                </Button>
              </Form>
            </Card>
          </Col>

          {/* 报告区 */}
          <Col span={16}>
            {/* loading 态 */}
            {loading && (
              <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" tip="正在执行五维用药审核…" />
              </div>
            )}

            {/* error 态 */}
            {!loading && error && (
              <Alert
                type="error" showIcon
                message="深度审核失败"
                description={error}
                action={<Button size="small" onClick={() => void submit()}>重试</Button>}
              />
            )}

            {/* empty 态 */}
            {!loading && !error && !data && (
              <Card>
                <Empty description={reviewed ? '审核完成，无返回数据' : '录入左侧处方信息，启动 AI 深度审核'} />
              </Card>
            )}

            {/* 数据态 */}
            {!loading && !error && data && risk && (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col flex="auto">
                      <Title level={5} style={{ marginBottom: 4 }}>
                        审核结论
                        <Tag color={risk.color} style={{ marginLeft: 12 }}>{risk.label}</Tag>
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.summary}</Paragraph>
                    </Col>
                    <Col>
                      <Text type="secondary">
                        高风险 {data.counts.critical} · 需核对 {data.counts.warning} · 共 {data.counts.total} 项
                      </Text>
                    </Col>
                  </Row>
                </Card>

                <Row gutter={16}>
                  <Col span={12} style={{ marginBottom: 16 }}>
                    <Card title="药物相互作用" size="small">
                      {data.interactions.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未检出相互作用" />
                      ) : (
                        <List size="small" dataSource={data.interactions}
                          renderItem={(item) => (
                            <List.Item>
                              <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                              <div>
                                <Text strong>{item.drugA} + {item.drugB}
                                  {item.withCurrentMed && <Tag color="geekblue" style={{ marginLeft: 6 }}>含在用药</Tag>}
                                </Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.reason}；{item.suggestion}</Paragraph>
                              </div>
                            </List.Item>
                          )} />
                      )}
                    </Card>
                  </Col>

                  <Col span={12} style={{ marginBottom: 16 }}>
                    <Card title="禁忌症 / 过敏" size="small">
                      {data.contraindications.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无禁忌命中" />
                      ) : (
                        <List size="small" dataSource={data.contraindications}
                          renderItem={(item) => (
                            <List.Item>
                              <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                              <div>
                                <Text strong>{item.drug}（{item.factor}）</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.reason}；{item.suggestion}</Paragraph>
                              </div>
                            </List.Item>
                          )} />
                      )}
                    </Card>
                  </Col>

                  <Col span={12} style={{ marginBottom: 16 }}>
                    <Card title="剂量合理性" size="small">
                      {data.doseIssues.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="剂量在合理范围" />
                      ) : (
                        <List size="small" dataSource={data.doseIssues}
                          renderItem={(item) => (
                            <List.Item>
                              <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                              <div>
                                <Text strong>{item.drug}：实际 {item.actual} / 上限 {item.limit}</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.suggestion}</Paragraph>
                              </div>
                            </List.Item>
                          )} />
                      )}
                    </Card>
                  </Col>

                  <Col span={12} style={{ marginBottom: 16 }}>
                    <Card title="重复用药" size="small">
                      {data.duplicateTherapy.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无同类重复" />
                      ) : (
                        <List size="small" dataSource={data.duplicateTherapy}
                          renderItem={(item) => (
                            <List.Item>
                              <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                              <div>
                                <Text strong>{item.drugA} + {item.drugB}（{item.category}）</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.reason}；{item.suggestion}</Paragraph>
                              </div>
                            </List.Item>
                          )} />
                      )}
                    </Card>
                  </Col>

                  <Col span={24} style={{ marginBottom: 16 }}>
                    <Card title="特殊人群" size="small">
                      {data.specialPopulation.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无特殊人群告警" />
                      ) : (
                        <List size="small" dataSource={data.specialPopulation}
                          renderItem={(item) => (
                            <List.Item>
                              <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                              <div>
                                <Text strong>{item.drug} · {item.population}</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.reason}；{item.suggestion}</Paragraph>
                              </div>
                            </List.Item>
                          )} />
                      )}
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
