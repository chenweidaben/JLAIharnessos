/**
 * 健澜科技 jlmedaios - 【患者体验深化】M174-D 满意度深化闭环页
 *
 * 设计原则：满意度闭环要真改进，不能只是登记。
 *   页面按 多渠道收集 → 情感分析+5Why根因 → PDCA改进跟踪 → NPS净推荐值 呈现：
 *     收集  门诊/住院/手术/检查/药房/后勤 六触点均分与负面占比；
 *     分析  正面/中性/负面自动分类 + 5Why 追问链；
 *     改进  PDCA 四阶段（Plan/Do/Check/Act）派单跟踪；
 *     NPS  推荐者/被动者/贬损者三档，净推荐值随改进变化。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 持续优化与新场景：未来新增触点（互联网医院/家庭病床）直接扩 channel 列。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Layout, Progress, Row, Space, Spin, Steps, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ToolOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const PAGE_BG = '#f5f7fa';

/* 与 BFF DeepSatisfactionLoopView 对齐的前端类型 */
interface ChannelStat {
  channel: string;
  label: string;
  count: number;
  avgScore: number;
  negativeRatio: number;
}
interface EmotionAnalysis {
  label: 'positive' | 'neutral' | 'negative';
  score: number;
  hitKeywords: string[];
}
interface FiveWhyStep { level: number; question: string; answer: string; }
interface FiveWhyAnalysis {
  rootCause: string;
  rootCauseLabel: string;
  chain: FiveWhyStep[];
  confidence: number;
}
interface PdcaAction {
  actionId: string;
  category: string;
  phase: 'plan' | 'do' | 'check' | 'act';
  action: string;
  owner: string;
  dueDays: number;
  beforeScore?: number;
  afterScore?: number;
}
interface NpsSummary {
  sampleSize: number;
  promoterCount: number;
  passiveCount: number;
  detractorCount: number;
  nps: number;
}
interface DeepLoop {
  collect: {
    total: number;
    channels: ChannelStat[];
    emotion: { positive: number; neutral: number; negative: number; negativeRatio: number };
    underpowered: boolean;
  };
  analyze: { emotionDistribution: EmotionAnalysis[]; rootCauses: FiveWhyAnalysis[] };
  improve: { actions: PdcaAction[]; phaseDistribution: Record<string, number> };
  nps: NpsSummary;
}
interface TrendPoint { period: string; sampleSize: number; avgScore: number; negativeRatio: number; nps: number | null; }
interface SatisfactionTrend {
  dept: string;
  points: TrendPoint[];
  signal: 'rising' | 'stable' | 'falling';
  scoreDelta: number;
  negativeRatioDelta: number;
  npsDelta: number | null;
  summary: string;
}
interface SatisfactionBenchmark {
  self: { dept: string; avgScore: number; negativeRatio: number; nps: number; sampleSize: number };
  peers: { name: string; avgScore: number; negativeRatio: number; nps: number }[];
  scoreGapToBest: number;
  rank: number;
  total: number;
  summary: string;
}
interface VoiceQuote { channel: string; text: string; emotion: 'positive' | 'neutral' | 'negative'; }
interface PatientVoiceReport {
  period: string;
  totalSignals: number;
  topNegativeKeywords: { word: number; count: number; category: string }[];
  positiveQuotes: VoiceQuote[];
  negativeQuotes: VoiceQuote[];
  recommendations: string[];
}
interface DeepView {
  periodDays: number;
  dataSource: 'database' | 'demo';
  loop: DeepLoop;
  trend: SatisfactionTrend;
  benchmark: SatisfactionBenchmark;
  voice: PatientVoiceReport;
  generatedAt: string;
}

const PHASE_META: Record<string, { color: string; text: string }> = {
  plan: { color: '#4A90D9', text: 'P·计划' },
  do: { color: '#d48806', text: 'D·执行' },
  check: { color: '#722ed1', text: 'C·检查' },
  act: { color: '#52c41a', text: 'A·处置' },
};
const EMOTION_META: Record<string, { color: string; text: string }> = {
  positive: { color: '#52c41a', text: '正面' },
  neutral: { color: '#8c8c8c', text: '中性' },
  negative: { color: '#cf1322', text: '负面' },
};
const TREND_TEXT: Record<string, string> = { rising: '↑ 恶化', stable: '→ 平稳', falling: '↓ 收敛' };

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

export default function SatisfactionDeepPage() {
  const [data, setData] = useState<DeepView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch('/api/v1/patient/satisfaction/deep');
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message || '加载失败');
        if (!cancelled) setData(json.data as DeepView);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '网络异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Spin size="large" tip="正在汇聚满意度深化闭环数据…" />
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
  if (!data) return null;
  const { loop, trend, benchmark, voice } = data;

  return (
    <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* 头部 */}
        <Card
          style={{
            background: `linear-gradient(135deg, ${DEEP_BG} 0%, ${MID_BLUE} 100%)`,
            border: 'none',
            marginBottom: 16,
          }}
        >
          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                患者体验深化 · 满意度闭环
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
                多渠道收集 → 情感分析+5Why根因 → PDCA改进跟踪 → NPS净推荐值，真改进不只登记。
              </Paragraph>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge
                count={data.dataSource === 'demo' ? '演示数据' : '真实数据'}
                style={{ background: data.dataSource === 'demo' ? '#d48806' : '#52c41a' }}
              />
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 8 }}>
                近 {data.periodDays} 天
              </div>
            </div>
          </Space>
        </Card>

        {/* 步骤条 */}
        <Card style={{ marginBottom: 16 }}>
          <Steps
            current={4}
            size="small"
            items={[
              { title: '多渠道收集', description: '门诊/住院/手术/检查/药房/后勤', icon: <SearchOutlined /> },
              { title: '情感+5Why', description: '正/中/负自动分类，五层追问', icon: <ToolOutlined /> },
              { title: 'PDCA 跟踪', description: 'Plan→Do→Check→Act', icon: <ThunderboltOutlined /> },
              { title: 'NPS 净推荐', description: '推荐者-贬损者，跟踪走向', icon: <CheckCircleOutlined /> },
            ]}
          />
        </Card>

        {/* ① 多渠道收集 */}
        <Card title={<span style={{ color: MID_BLUE }}>① 多渠道收集 · 六触点均分与负面占比</span>} style={{ marginBottom: 16 }} size="small">
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={8} md={4}><StatCard label="信号总数" value={loop.collect.total} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="正面" value={loop.collect.emotion.positive} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="中性" value={loop.collect.emotion.neutral} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="负面" value={loop.collect.emotion.negative} /></Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard label="负面占比" value={`${Math.round(loop.collect.emotion.negativeRatio * 100)}%`} />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard label="NPS" value={loop.nps.nps} suffix="分" />
            </Col>
          </Row>
          {loop.collect.underpowered && (
            <Alert style={{ marginTop: 12 }} type="warning" showIcon message="样本量较小（<10），结论仅供参考，不做夸大判定。" />
          )}
          <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
            {loop.collect.channels.map((ch) => (
              <Col xs={12} sm={8} md={4} key={ch.channel}>
                <Card size="small" style={{ background: '#fafbfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{ch.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{ch.count} 条</Text>
                  </div>
                  <div style={{ fontSize: 20, color: DEEP_BG, fontWeight: 600, marginTop: 4 }}>
                    {ch.avgScore.toFixed(1)}<Text type="secondary" style={{ fontSize: 12 }}> /5</Text>
                  </div>
                  <Progress percent={Math.round(ch.negativeRatio * 100)} size="small" strokeColor="#cf1322" format={(p) => `负面 ${p}%`} />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ② 情感分析 + 5Why 根因 */}
        <Card title={<span style={{ color: MID_BLUE }}>② 情感分析 + 5Why 根因追问</span>} style={{ marginBottom: 16 }} size="small">
          {loop.analyze.rootCauses.length === 0 ? (
            <Paragraph type="secondary">本期未识别到需要根因分析的负面信号。</Paragraph>
          ) : (
            loop.analyze.rootCauses.map((rc) => (
              <div key={rc.rootCause} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space size="middle" wrap style={{ marginBottom: 8 }}>
                  <Tag color={ACCENT}>{rc.rootCauseLabel}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>置信度 {Math.round(rc.confidence * 100)}%</Text>
                </Space>
                {rc.chain.map((step) => (
                  <div key={step.level} style={{ paddingLeft: 12, borderLeft: `2px solid ${ACCENT}`, marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 13 }}>Why{step.level}：{step.question}</Text>
                    <div style={{ paddingLeft: 12, color: '#595959', fontSize: 13 }}>→ {step.answer}</div>
                  </div>
                ))}
              </div>
            ))
          )}
        </Card>

        {/* ③ PDCA 改进跟踪 */}
        <Card
          title={<span style={{ color: MID_BLUE }}>③ PDCA 改进跟踪 · 责任到人 + 限期</span>}
          size="small"
          extra={
            <Space>
              {Object.entries(PHASE_META).map(([k, m]) => (
                <Tag key={k} color={m.color}>{m.text} {loop.improve.phaseDistribution[k] ?? 0}</Tag>
              ))}
            </Space>
          }
        >
          {loop.improve.actions.length === 0 ? (
            <Paragraph type="secondary">暂无待改进事项。</Paragraph>
          ) : (
            loop.improve.actions.map((a) => {
              const meta = PHASE_META[a.phase];
              return (
                <div key={a.actionId} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Space size="middle" wrap style={{ marginBottom: 6 }}>
                    <Tag color={meta.color}>{meta.text}</Tag>
                    <Text strong>责任：{a.owner}</Text>
                    <Tag icon={<ClockCircleOutlined />} color="orange">限期 {a.dueDays} 天</Tag>
                    {typeof a.beforeScore === 'number' && typeof a.afterScore === 'number' && (
                      <Text>
                        {a.beforeScore.toFixed(1)} → {a.afterScore.toFixed(1)}
                      </Text>
                    )}
                    {a.phase === 'act' && <Tag icon={<CheckCircleOutlined />} color="green">已标准化</Tag>}
                  </Space>
                  <Paragraph style={{ marginBottom: 4 }}>{a.action}</Paragraph>
                </div>
              );
            })
          )}
          {loop.improve.actions.some((a) => a.phase === 'plan' || a.phase === 'do') && (
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              icon={<ReloadOutlined />}
              message="PDCA 未闭环事项已派单，30 天后自动进入 Check 阶段复查满意度与 NPS，不允许 Plan 完即归档。"
            />
          )}
        </Card>

        {/* ④ NPS 净推荐值 + 趋势 + 对标 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Card title={<span style={{ color: MID_BLUE }}>④ NPS 净推荐值</span>} size="small">
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: loop.nps.nps >= 0 ? '#52c41a' : '#cf1322' }}>
                  {loop.nps.nps >= 0 ? `+${loop.nps.nps}` : loop.nps.nps}
                </div>
                <Text type="secondary">样本 {loop.nps.sampleSize} 人</Text>
              </div>
              <Row gutter={8}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#52c41a', fontWeight: 600 }}>{loop.nps.promoterCount}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>推荐者</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#8c8c8c', fontWeight: 600 }}>{loop.nps.passiveCount}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>被动者</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#cf1322', fontWeight: 600 }}>{loop.nps.detractorCount}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>贬损者</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card
              title={<span style={{ color: MID_BLUE }}>趋势 · {trend.dept}</span>}
              size="small"
              extra={<Tag color={trend.signal === 'falling' ? 'green' : trend.signal === 'rising' ? 'red' : 'default'}>{TREND_TEXT[trend.signal]}</Tag>}
            >
              <Paragraph style={{ marginBottom: 8 }}>{trend.summary}</Paragraph>
              <Row gutter={8}>
                {trend.points.map((p) => (
                  <Col xs={12} sm={6} key={p.period}>
                    <div style={{ textAlign: 'center', padding: 8, background: '#fafbfd', borderRadius: 4 }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>{p.period}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: DEEP_BG }}>{p.avgScore.toFixed(1)}</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>NPS {p.nps ?? '-'}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 对标 */}
        <Card title={<span style={{ color: MID_BLUE }}>对标 · 本科室 vs 区域标杆</span>} style={{ marginBottom: 16 }} size="small">
          <Paragraph style={{ marginBottom: 8 }}>{benchmark.summary}</Paragraph>
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={6}>
              <Card size="small" style={{ background: `linear-gradient(135deg, ${DEEP_BG}, ${MID_BLUE})` }}>
                <div style={{ color: '#fff', fontSize: 12 }}>本科室（第 {benchmark.rank}/{benchmark.total}）</div>
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{benchmark.self.avgScore.toFixed(2)}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>NPS {benchmark.self.nps}</div>
              </Card>
            </Col>
            {benchmark.peers.map((p) => (
              <Col xs={24} sm={6} key={p.name}>
                <Card size="small">
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{p.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: DEEP_BG }}>{p.avgScore.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>NPS {p.nps}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 患者之声 */}
        <Card title={<span style={{ color: MID_BLUE }}>患者之声 · {voice.period}</span>} style={{ marginBottom: 16 }} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Paragraph strong style={{ color: '#cf1322' }}>负面原声（TOP {voice.negativeQuotes.length}）</Paragraph>
              {voice.negativeQuotes.length === 0 ? (
                <Text type="secondary">暂无负面原声。</Text>
              ) : (
                voice.negativeQuotes.map((q, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                    <Tag color="red" style={{ fontSize: 11 }}>{q.channel}</Tag>
                    <Text type="secondary" style={{ fontSize: 13 }}>「{q.text}」</Text>
                  </div>
                ))
              )}
            </Col>
            <Col xs={24} md={12}>
              <Paragraph strong style={{ color: '#52c41a' }}>正面原声（TOP {voice.positiveQuotes.length}）</Paragraph>
              {voice.positiveQuotes.length === 0 ? (
                <Text type="secondary">暂无正面原声。</Text>
              ) : (
                voice.positiveQuotes.map((q, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                    <Tag color="green" style={{ fontSize: 11 }}>{q.channel}</Tag>
                    <Text type="secondary" style={{ fontSize: 13 }}>「{q.text}」</Text>
                  </div>
                ))
              )}
            </Col>
          </Row>
          {voice.recommendations.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Paragraph strong style={{ color: MID_BLUE }}>改进建议</Paragraph>
              {voice.recommendations.map((r, i) => (
                <div key={i} style={{ padding: '4px 0' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}><ExclamationCircleOutlined style={{ color: '#d48806', marginRight: 6 }} />{r}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Paragraph style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24 }}>
          杭州健澜科技有限公司 · 【患者体验深化】满意度闭环 M174-D
        </Paragraph>
      </Content>
    </Layout>
  );
}
