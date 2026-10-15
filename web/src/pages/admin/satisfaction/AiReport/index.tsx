/**
 * 健澜科技 jlmedaios - M153-D 患者满意度智能分析页（仅 admin）
 *
 * 【临床决策支持】基于患者自由文本评论的情感分析与关键问题抽取：
 *   - 数据来自 GET /api/v1/admin/satisfaction/ai-report；
 *   - 顶部深海蓝渐变头部 + 评论数 / 负面占比概览；
 *   - 情感倾向分布（正面/中性/负面）；
 *   - 关键问题表（类别 / 命中条数 / 严重度 / 代表性评论）；
 *   - 自动改进计划（按高/中/低优先级排序，附量化目标）。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* 与 BFF satisfactionAiAggregator 输出对齐 */
type Emotion = 'positive' | 'neutral' | 'negative';

interface SentimentResult {
  total: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  negativeRatio: number;
  overall: Emotion;
}
interface KeyIssue {
  category: string;
  label: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  sampleComments: string[];
}
interface ImprovementPlan {
  dept: string;
  avgScore: number;
  priority: 'high' | 'medium' | 'low';
  actions: string[];
  target: string;
}
interface LowScoreDept {
  dept: string;
  avgScore: number;
  issueCount: number;
}
interface AiReportView {
  periodDays: number;
  totalSurveys: number;
  totalComments: number;
  sentiment: SentimentResult;
  issues: KeyIssue[];
  plan: ImprovementPlan[];
  lowScoreDepts: LowScoreDept[];
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const SEVERITY_COLOR: Record<KeyIssue['severity'], string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};
const PRIORITY_COLOR: Record<ImprovementPlan['priority'], string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};
const EMOTION_META: Record<Emotion, { label: string; color: string }> = {
  positive: { label: '正面', color: '#3f8600' },
  neutral: { label: '中性', color: '#8c8c8c' },
  negative: { label: '负面', color: '#cf1322' },
};

export default function SatisfactionAiReportPage() {
  const [data, setData] = useState<AiReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/satisfaction/ai-report');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as AiReportView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const issueColumns: ColumnsType<KeyIssue> = useMemo(
    () => [
      { title: '问题类别', dataIndex: 'label' },
      {
        title: '命中条数',
        dataIndex: 'count',
        width: 110,
        align: 'right',
        render: (v: number) => <Tag color={v >= 5 ? 'red' : v >= 2 ? 'orange' : 'default'}>{v}</Tag>,
      },
      {
        title: '严重度',
        dataIndex: 'severity',
        width: 100,
        render: (v: KeyIssue['severity']) => (
          <Tag color={SEVERITY_COLOR[v]}>{v === 'high' ? '高' : v === 'medium' ? '中' : '低'}</Tag>
        ),
      },
      {
        title: '代表性评论',
        dataIndex: 'sampleComments',
        render: (samples: string[]) => (
          <div style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
            {samples.length === 0 && <span style={{ color: '#999' }}>—</span>}
            {samples.map((s, i) => (
              <div key={i} style={{ marginBottom: 4 }}>· {s}</div>
            ))}
          </div>
        ),
      },
    ],
    [],
  );

  const sentiment = data?.sentiment;
  const overallMeta = sentiment ? EMOTION_META[sentiment.overall] : null;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝渐变头部 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>患者满意度智能分析</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              【临床决策支持】自由文本情感分析 · 关键问题抽取 · 自动改进计划
            </Paragraph>
          </Col>
          <Col>
            <Button onClick={load} loading={loading}>刷新</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在分析患者评论…" />
          </div>
        )}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={load}>重试</Button>}
          />
        )}
        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无满意度评论数据，待患者扫码填写后自动生成智能分析报告。" />
        )}

        {!loading && !error && data && sentiment && (
          <>
            {/* 概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="近 90 天问卷数" value={data.totalSurveys} suffix="份" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="参评评论数" value={data.totalComments} suffix="条" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="负面占比"
                    value={Number((sentiment.negativeRatio * 100).toFixed(1))}
                    suffix="%"
                    valueStyle={{ color: sentiment.negativeRatio >= 0.4 ? '#cf1322' : sentiment.negativeRatio >= 0.2 ? '#cf8a00' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="整体倾向"
                    value={overallMeta?.label ?? '—'}
                    valueStyle={{ color: overallMeta?.color ?? undefined }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 情感分布 */}
            <Card title="情感倾向分布" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Progress
                    type="circle"
                    percent={sentiment.total ? Math.round((sentiment.positiveCount / sentiment.total) * 100) : 0}
                    strokeColor="#3f8600"
                    format={(p) => <span>正面 {p}%</span>}
                  />
                  <div style={{ textAlign: 'center', marginTop: 8, color: 'rgba(0,0,0,0.55)' }}>
                    {sentiment.positiveCount} 条
                  </div>
                </Col>
                <Col span={8}>
                  <Progress
                    type="circle"
                    percent={sentiment.total ? Math.round((sentiment.neutralCount / sentiment.total) * 100) : 0}
                    strokeColor="#8c8c8c"
                    format={(p) => <span>中性 {p}%</span>}
                  />
                  <div style={{ textAlign: 'center', marginTop: 8, color: 'rgba(0,0,0,0.55)' }}>
                    {sentiment.neutralCount} 条
                  </div>
                </Col>
                <Col span={8}>
                  <Progress
                    type="circle"
                    percent={sentiment.total ? Math.round((sentiment.negativeCount / sentiment.total) * 100) : 0}
                    strokeColor="#cf1322"
                    format={(p) => <span>负面 {p}%</span>}
                  />
                  <div style={{ textAlign: 'center', marginTop: 8, color: 'rgba(0,0,0,0.55)' }}>
                    {sentiment.negativeCount} 条
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 关键问题 */}
            <Card title="关键问题抽取（按命中条数倒序）" style={{ marginBottom: 16 }}>
              {data.issues.length === 0 && (
                <Alert type="success" showIcon message="未在评论中识别到负面关键问题，继续保持。" />
              )}
              {data.issues.length > 0 && (
                <Table
                  rowKey="category"
                  columns={issueColumns}
                  dataSource={data.issues}
                  pagination={false}
                  size="small"
                />
              )}
            </Card>

            {/* 改进计划 */}
            <Card title="自动改进计划（按优先级排序）">
              {data.plan.length === 0 && (
                <Alert type="success" showIcon message="当前各来源维度均分均 ≥ 4，暂无待改进项。" />
              )}
              {data.plan.map((p) => (
                <Card key={p.dept} size="small" style={{ marginBottom: 8 }}>
                  <Row justify="space-between" align="middle">
                    <Col flex="auto">
                      <Tag color={PRIORITY_COLOR[p.priority]}>
                        {p.priority === 'high' ? '高优' : p.priority === 'medium' ? '中优' : '低优'}
                      </Tag>
                      <strong style={{ marginLeft: 8 }}>{p.dept}</strong>
                      <span style={{ marginLeft: 12, color: 'rgba(0,0,0,0.55)' }}>
                        均分 {p.avgScore.toFixed(1)} / 5
                      </span>
                      <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20, color: 'rgba(0,0,0,0.65)' }}>
                        {p.actions.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                      <div style={{ marginTop: 8, color: VI.accent }}>🎯 {p.target}</div>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
