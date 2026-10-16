/**
 * 健澜科技 jlmedaios - 【AI深化与智能运营】M168-C 患者全旅程管理页
 *
 * 设计原则：患者旅程要真实，不能虚构。
 *   一次门诊 = 八个节点一条时间线：
 *     预约挂号 → 分诊候诊 → 就诊 → 开单缴费 → 检查检验 → 取药 → 离院 → 随访
 *   页面自上而下回答四件事：
 *     时间线  每个节点到没到、等了多久、服务多久、对照门诊基准；
 *     瓶颈    哪个环节超出基准最多（事实描述，不指责人）；
 *     优化    每个瓶颈对应的可落地动作与预计释放等待；
 *     满意度  基于旅程事实的满意度预测与投诉风险（前瞻提示，不是事后问卷）。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FlagOutlined,
  HeartOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const PAGE_BG = '#f5f7fa';

/* 与 BFF patientJourney 输出对齐的前端类型 */
interface JourneyStage {
  nodeCode: string;
  nodeName: string;
  reached: boolean;
  benchmarkWaitMinutes: number;
  waitMinutes: number;
  durationMinutes: number;
  status: 'completed' | 'skipped' | 'in_progress' | 'pending';
  occurredAt: string | null;
  note: string;
}
interface PatientJourney {
  patientId: string;
  visitId: string;
  stages: JourneyStage[];
  reachedCount: number;
  completedCount: number;
  skippedBetween: string[];
  currentNode: string | null;
  totalWaitMinutes: number;
  totalElapsedMinutes: number;
  followupCompleted: boolean;
}
interface Bottleneck {
  nodeCode: string;
  nodeName: string;
  waitMinutes: number;
  benchmarkWaitMinutes: number;
  excessMinutes: number;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestion: string;
}
interface BottleneckReport {
  bottlenecks: Bottleneck[];
  worstNode: Bottleneck | null;
  summary: { avgWaitMinutes: number; overBenchmarkCount: number };
}
interface FlowRecommendation {
  nodeCode: string;
  nodeName: string;
  action: string;
  estimatedWaitSavedMinutes: number;
  expectedSatisfactionLift: number;
  priority: 'high' | 'medium' | 'low';
}
interface FlowOptimization {
  recommendations: FlowRecommendation[];
  totalEstimatedWaitSavedMinutes: number;
  overallPriority: 'high' | 'medium' | 'low';
}
interface SatisfactionPrediction {
  predictedScore: number;
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  positiveFactors: string[];
  negativeFactors: string[];
  confidence: 'high' | 'medium' | 'low';
}
interface JourneyView {
  patientId: string;
  journey: PatientJourney;
  bottlenecks: BottleneckReport;
  optimization: FlowOptimization;
  satisfaction: SatisfactionPrediction;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: '#cf1322',
  medium: '#d48806',
  low: '#52c41a',
};
const LEVEL_META: Record<string, { color: string; text: string }> = {
  excellent: { color: '#52c41a', text: '非常满意' },
  good: { color: ACCENT, text: '满意' },
  fair: { color: '#d48806', text: '一般' },
  poor: { color: '#cf1322', text: '不满意' },
  unknown: { color: '#8c8c8c', text: '数据不足·不预测' },
};
const RISK_META: Record<string, { color: string; text: string }> = {
  low: { color: '#52c41a', text: '低' },
  medium: { color: '#d48806', text: '中' },
  high: { color: '#cf1322', text: '高' },
};

const DEMO_PATIENTS = [
  { label: '演示患者 A（候诊/检查偏久）', value: 'P-2026101201' },
  { label: '演示患者 B（分时段预约顺畅）', value: 'P-2026101301' },
];

function StatCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <Card size="small" style={{ background: '#fff', borderTop: `3px solid ${ACCENT}` }}>
      <div style={{ fontSize: 13, color: '#8c8c8c' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: DEEP_BG, marginTop: 4 }}>
        {value}
        {suffix && <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8c8c' }}> {suffix}</span>}
      </div>
    </Card>
  );
}

export default function PatientJourneyPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialPatient = params.get('patientId') ?? DEMO_PATIENTS[0].value;
  const [patientId, setPatientId] = useState(initialPatient);
  const [data, setData] = useState<JourneyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch(`/api/v1/patient/journey/${encodeURIComponent(patientId)}`);
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message || '加载失败');
        if (!cancelled) setData(json.data as JourneyView);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '网络异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Spin size="large" tip="正在回放患者全旅程…" />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <Alert type="error" showIcon message="加载失败" description={error} />
        </Content>
      </Layout>
    );
  }

  const journey = data?.journey;
  if (!journey) return null;
  const bottlenecks = data!.bottlenecks;
  const optimization = data!.optimization;
  const satisfaction = data!.satisfaction;
  const levelMeta = LEVEL_META[satisfaction.level];

  return (
    <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* 头部：深海蓝横幅 */}
        <Card
          style={{
            background: `linear-gradient(135deg, ${DEEP_BG} 0%, ${MID_BLUE} 100%)`,
            border: 'none',
            marginBottom: 16,
          }}
        >
          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }} direction="vertical">
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                  患者全旅程管理
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
                  预约挂号 → 分诊候诊 → 就诊 → 开单缴费 → 检查检验 → 取药 → 离院 → 随访：
                  把散落各系统的节点拼成一条时间线，等在哪、卡在哪，一眼看清。
                </Paragraph>
              </div>
              <Badge count="AI深化与智能运营" style={{ background: ACCENT }} />
            </div>
            <Segmented
              options={DEMO_PATIENTS}
              value={patientId}
              onChange={(v) => setPatientId(String(v))}
            />
          </Space>
        </Card>

        {/* 概览四卡 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <StatCard label="已走节点" value={`${journey.completedCount}/8`} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard label="累计等待" value={journey.totalWaitMinutes} suffix="分钟" />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard label="总在院/在途" value={journey.totalElapsedMinutes} suffix="分钟" />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="离院随访"
              value={journey.followupCompleted ? '已完成' : '未完成'}
            />
          </Col>
        </Row>

        {/* 八节点时间线 */}
        <Card title={<span style={{ color: MID_BLUE }}>① 全旅程时间线（对照门诊基准）</span>} style={{ marginBottom: 16 }} size="small">
          <List
            dataSource={journey.stages}
            renderItem={(s) => {
              const overBench = s.reached && s.benchmarkWaitMinutes > 0 && s.waitMinutes > s.benchmarkWaitMinutes;
              return (
                <List.Item style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <Space size="middle" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space size="middle">
                      {s.reached ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <FlagOutlined style={{ color: '#d9d9d9' }} />
                      )}
                      <Text strong style={{ fontSize: 15 }}>{s.nodeName}</Text>
                      {s.reached && s.status === 'completed' && <Tag color="green">已完成</Tag>}
                      {s.reached && s.status === 'in_progress' && <Tag color="processing">进行中</Tag>}
                      {!s.reached && <Tag>未到达</Tag>}
                    </Space>
                    <Space size="small" wrap>
                      {s.reached ? (
                        <>
                          <Text type="secondary">
                            等待 {s.waitMinutes} 分钟（基准 {s.benchmarkWaitMinutes}）
                          </Text>
                          {overBench && <Tag color="red">超基准 {s.waitMinutes - s.benchmarkWaitMinutes} 分钟</Tag>}
                          <Text type="secondary">服务 {s.durationMinutes} 分钟</Text>
                          {s.note && <Text type="secondary" style={{ fontSize: 12 }}>（{s.note}）</Text>}
                        </>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Space>
                  </Space>
                </List.Item>
              );
            }}
          />
          {journey.skippedBetween.length > 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message={`流程断环：首末到达节点之间缺失 ${journey.skippedBetween.length} 个节点，需核实是否跳步登记。`}
            />
          )}
        </Card>

        {/* 瓶颈识别 */}
        <Card
          title={<span style={{ color: MID_BLUE }}>② 瓶颈识别（只报超基准环节，按超出量排序）</span>}
          style={{ marginBottom: 16 }}
          size="small"
          extra={<Text type="secondary">平均等待 {bottlenecks.summary.avgWaitMinutes} 分钟</Text>}
        >
          {bottlenecks.bottlenecks.length === 0 ? (
            <Paragraph type="secondary">各节点等待均在门诊基准内，暂无瓶颈。</Paragraph>
          ) : (
            bottlenecks.bottlenecks.map((b) => (
              <div key={b.nodeCode} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space size="middle" wrap style={{ marginBottom: 6 }}>
                  <Tag color={SEVERITY_COLOR[b.severity]}>
                    {b.severity === 'high' ? '高' : b.severity === 'medium' ? '中' : '低'}优
                  </Tag>
                  <Text strong>{b.nodeName}</Text>
                </Space>
                <Paragraph style={{ marginBottom: 4 }}>{b.reason}</Paragraph>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  建议：{b.suggestion}
                </Text>
              </div>
            ))
          )}
        </Card>

        {/* 流程优化 */}
        <Card
          title={<span style={{ color: MID_BLUE }}>③ 流程优化动作（预计释放等待）</span>}
          style={{ marginBottom: 16 }}
          size="small"
          extra={<Tag color={SEVERITY_COLOR[optimization.overallPriority]}>整体优先级 {optimization.overallPriority}</Tag>}
        >
          {optimization.recommendations.map((r) => (
            <div key={r.nodeCode} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Space size="middle" wrap style={{ marginBottom: 6 }}>
                <Tag color={ACCENT}>{r.nodeName}</Tag>
                <Tag icon={<ClockCircleOutlined />} color="orange">
                  可释放约 {r.estimatedWaitSavedMinutes} 分钟
                </Tag>
                <Tag color="blue">满意度预计 +{r.expectedSatisfactionLift}</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 13 }}>{r.action}</Text>
            </div>
          ))}
          {optimization.totalEstimatedWaitSavedMinutes > 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              message={`落地全部动作预计合计释放等待约 ${optimization.totalEstimatedWaitSavedMinutes} 分钟（保守按超基准量 60% 估算）。`}
            />
          )}
        </Card>

        {/* 满意度预测 */}
        <Card
          title={<span style={{ color: MID_BLUE }}>④ 满意度预测（基于旅程事实，前瞻提示）</span>}
          size="small"
          extra={
            <Space>
              <Tag color={levelMeta.color}>{levelMeta.text}</Tag>
              <Tag color={RISK_META[satisfaction.risk].color}>投诉风险 {satisfaction.risk === 'low' ? '低' : satisfaction.risk === 'medium' ? '中' : '高'}</Tag>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 44, fontWeight: 700, color: levelMeta.color }}>
                  {satisfaction.predictedScore}
                </div>
                <Text type="secondary">预测满意度（0-100）</Text>
                <Progress
                  percent={satisfaction.predictedScore}
                  strokeColor={{ from: MID_BLUE, to: ACCENT }}
                  size="small"
                  style={{ maxWidth: 220 }}
                />
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Text strong style={{ color: '#52c41a' }}>
                <CheckCircleOutlined /> 正向因素
              </Text>
              {satisfaction.positiveFactors.length === 0 ? (
                <Paragraph type="secondary" style={{ marginTop: 8 }}>暂无可量化正向项。</Paragraph>
              ) : (
                satisfaction.positiveFactors.map((f, i) => (
                  <Text key={i} type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                    · {f}
                  </Text>
                ))
              )}
            </Col>
            <Col xs={24} md={8}>
              <Text strong style={{ color: '#cf1322' }}>
                <ExclamationCircleOutlined /> 扣分项
              </Text>
              {satisfaction.negativeFactors.length === 0 ? (
                <Paragraph type="secondary" style={{ marginTop: 8 }}>无扣分项。</Paragraph>
              ) : (
                satisfaction.negativeFactors.map((f, i) => (
                  <Text key={i} type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                    · {f}
                  </Text>
                ))
              )}
            </Col>
          </Row>
          <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
            <HeartOutlined /> <Text type="secondary" style={{ fontSize: 12 }}>
              预测置信度：{satisfaction.confidence === 'high' ? '高' : satisfaction.confidence === 'medium' ? '中' : '低'}（已完成节点越多越可信）；本预测为流程改进辅助，不作为对一线人员的考核依据。
            </Text>
          </Paragraph>
        </Card>

        <Paragraph style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24 }}>
          杭州健澜科技有限公司 · 【AI深化与智能运营】患者全旅程管理 M168-C
        </Paragraph>
      </Content>
    </Layout>
  );
}
