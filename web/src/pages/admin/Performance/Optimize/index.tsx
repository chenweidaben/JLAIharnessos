/**
 * 健澜科技 jlmedaios - M151-D 系统性能持续优化报告页（仅 admin · 质量补齐与新场景）
 *
 * 展示 BFF 纯函数聚合的慢查询优化闭环：
 *  - optimizeSlowQueries：三类问题（N+1 / 缺索引 / 聚合无物化视图）+ 对应优化动作；
 *  - getPerformanceImprovementReport：优化前后 P50/P95/P99 对比，目标 P95 < 80ms。
 * 三态：loading / error（可重试）/ empty。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF perfOptimizeAggregator 输出对齐 */
type SlowQueryKind = 'N_PLUS_ONE' | 'MISSING_INDEX' | 'AGG_NO_MVIEW';
type OptimizationMeasure = 'BATCH_LOAD' | 'ADD_INDEX' | 'MATERIALIZED_VIEW';

interface SlowQueryIssue {
  id: string;
  table: string;
  pattern: string;
  kind: SlowQueryKind;
  beforeMs: number;
  afterMs: number;
  callsPerDay: number;
}

interface OptimizationAction {
  issueId: string;
  table: string;
  kind: SlowQueryKind;
  measure: OptimizationMeasure;
  measureLabel: string;
  savedMs: number;
  savedPct: number;
  risk: 'low' | 'medium';
}

interface OptimizationReport {
  issues: SlowQueryIssue[];
  actions: OptimizationAction[];
  summary: {
    totalIdentified: number;
    byKind: Record<SlowQueryKind, number>;
    totalSavedMsPerDay: number;
    avgImprovementPct: number;
  };
}

interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

interface Comparison {
  before: LatencyPercentiles;
  after: LatencyPercentiles;
  delta: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgMs: number;
    p95ReductionPct: number;
  };
  target: {
    p95TargetMs: number;
    p95Met: boolean;
  };
}

interface PerfOptimizeResponse {
  optimization: OptimizationReport;
  comparison: Comparison;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function kindTag(k: SlowQueryKind) {
  if (k === 'N_PLUS_ONE') return <Tag color="purple">N+1</Tag>;
  if (k === 'MISSING_INDEX') return <Tag color="orange">缺索引</Tag>;
  return <Tag color="cyan">聚合无物化视图</Tag>;
}

function measureTag(m: OptimizationMeasure) {
  if (m === 'BATCH_LOAD') return <Tag color="blue">批量加载</Tag>;
  if (m === 'ADD_INDEX') return <Tag color="geekblue">加索引</Tag>;
  return <Tag color="magenta">物化视图</Tag>;
}

export default function PerfOptimizePage() {
  const [data, setData] = useState<PerfOptimizeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/optimize');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PerfOptimizeResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const comp = data?.comparison;
  const opt = data?.optimization;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          系统性能持续优化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          慢查询识别 · N+1 改批量 / 分页加索引 / 聚合加物化视图 · 目标 P95 &lt; 80ms · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载性能优化报告中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无性能优化数据。" />
        )}

        {!loading && !error && data && opt && comp && (
          <>
            {/* 概览指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="识别慢查询" value={opt.summary.totalIdentified} suffix="条" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="加权耗时下降"
                    value={opt.summary.avgImprovementPct}
                    suffix="%"
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="P95 优化后"
                    value={comp.after.p95}
                    suffix="ms"
                    valueStyle={{
                      color: comp.target.p95Met ? '#3f8600' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="P95 目标 (<80ms)"
                    value={comp.target.p95Met ? '已达成' : '未达成'}
                    valueStyle={{
                      fontSize: 20,
                      color: comp.target.p95Met ? '#3f8600' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* P95 目标达成进度 */}
            <Card title="P95 优化前后对比（ms）" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <Statistic title="P50" value={comp.before.p50} suffix="ms" />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    → {comp.after.p50} ms（{comp.delta.p50Ms}）
                  </Paragraph>
                </Col>
                <Col span={8}>
                  <Statistic
                    title="P95"
                    value={comp.before.p95}
                    suffix="ms"
                    valueStyle={{ color: '#cf1322' }}
                  />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    → {comp.after.p95} ms（{comp.delta.p95Ms}，下降 {comp.delta.p95ReductionPct}%）
                  </Paragraph>
                  <Progress
                    percent={Math.min(
                      100,
                      Math.round((comp.after.p95 / comp.target.p95TargetMs) * 100),
                    )}
                    size="small"
                    status={comp.target.p95Met ? 'success' : 'exception'}
                  />
                </Col>
                <Col span={8}>
                  <Statistic title="P99" value={comp.before.p99} suffix="ms" />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    → {comp.after.p99} ms（{comp.delta.p99Ms}）
                  </Paragraph>
                </Col>
              </Row>
            </Card>

            {/* 慢查询目录 */}
            <Card title="慢查询识别目录（按优化前耗时降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={opt.issues}
                locale={{ emptyText: '暂无慢查询记录' }}
                columns={[
                  { title: '表', dataIndex: 'table', width: 200 },
                  {
                    title: '查询模式',
                    dataIndex: 'pattern',
                    render: (v: string) => (
                      <Text code style={{ fontSize: 12 }}>
                        {v}
                      </Text>
                    ),
                  },
                  {
                    title: '类别',
                    dataIndex: 'kind',
                    width: 140,
                    render: (v: SlowQueryKind) => kindTag(v),
                  },
                  {
                    title: '优化前',
                    dataIndex: 'beforeMs',
                    width: 90,
                    render: (v: number) => <Tag color="red">{v} ms</Tag>,
                  },
                  {
                    title: '优化后',
                    dataIndex: 'afterMs',
                    width: 90,
                    render: (v: number) => <Tag color="green">{v} ms</Tag>,
                  },
                  { title: '日调用', dataIndex: 'callsPerDay', width: 90 },
                ]}
              />
            </Card>

            {/* 优化动作 */}
            <Card title="优化动作清单（N+1→批量 / 分页→索引 / 聚合→物化视图）">
              <Table
                rowKey="issueId"
                pagination={false}
                dataSource={opt.actions}
                locale={{ emptyText: '暂无优化动作' }}
                columns={[
                  { title: '表', dataIndex: 'table', width: 200 },
                  {
                    title: '措施',
                    dataIndex: 'measure',
                    width: 120,
                    render: (v: OptimizationMeasure) => measureTag(v),
                  },
                  {
                    title: '措施说明',
                    dataIndex: 'measureLabel',
                    render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
                  },
                  {
                    title: '节省',
                    dataIndex: 'savedMs',
                    width: 90,
                    render: (v: number) => <Tag color="green">-{v} ms</Tag>,
                  },
                  {
                    title: '降幅',
                    dataIndex: 'savedPct',
                    width: 90,
                    render: (v: number) => `${v}%`,
                  },
                  {
                    title: '风险',
                    dataIndex: 'risk',
                    width: 80,
                    render: (v: 'low' | 'medium') =>
                      v === 'low' ? <Tag color="green">低</Tag> : <Tag color="orange">中</Tag>,
                  },
                ]}
              />
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                设计原则：本页为「建议 + 预期收益」报告，不直接执行 DDL；
                加索引写放大风险为中，需在低峰窗口灰度；物化视图需配套刷新策略。
              </Paragraph>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
