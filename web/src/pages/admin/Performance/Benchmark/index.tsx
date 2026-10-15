/**
 * 健澜科技 jlmedaios - M149-C API 性能基准测试报告页（仅 admin）
 *
 * 数据来源：GET /api/v1/admin/performance/benchmark（BFF 纯函数确定性种子模拟）。
 * 展示指标：P50/P95/P99 响应时间、吞吐（req/s）、错误率；
 * 生产质量门禁：P95 < 500ms、错误率 < 0.1%（逐 API 达标判断）；
 * 并与上一发布周期基线（PERFORMANCE_BASELINE）做版本漂移对比。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 三态：loading / error（可重试）/ empty。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF benchmarkAllApis 输出对齐 */
interface ApiBenchmarkRow {
  api: string;
  name: string;
  sampleCount: number;
  errorCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  throughputRps: number;
  errorRate: number;
  gatePassed: boolean;
}

/** 与 BFF comparePerformanceBaseline 输出对齐 */
interface Comparison {
  p95DeltaMs: number;
  errorRateDelta: number;
  throughputDeltaRps: number;
  p95Improved: boolean;
  errorImproved: boolean;
  throughputImproved: boolean;
  regression: boolean;
  conclusion: string;
}

interface BenchmarkResponse {
  apis: ApiBenchmarkRow[];
  overallP95Ms: number;
  overallThroughputRps: number;
  overallErrorRate: number;
  gate: 'pass' | 'warn' | 'fail';
  gateNote: string;
  thresholds?: { p95LimitMs: number; errorRateLimit: number };
  comparison: Comparison;
  baseline: { p95Ms: number; errorRate: number; throughputRps: number };
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** P95 门禁色：≤300ms 绿，≤500ms 橙，>500ms 红 */
function p95TagColor(p95: number, limit: number): string {
  if (p95 > limit) return 'red';
  if (p95 > limit * 0.6) return 'orange';
  return 'green';
}

export default function PerformanceBenchmarkPage() {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/benchmark');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as BenchmarkResponse);
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

  const p95Limit = data?.thresholds?.p95LimitMs ?? 500;
  const errLimit = data?.thresholds?.errorRateLimit ?? 0.001;

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
          API 性能基准测试
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          生产质量门禁：P95 &lt; 500ms、错误率 &lt; 0.1% · 确定性种子模拟 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载性能基准数据中…" />
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

        {!loading && !error && !data && <Alert type="info" showIcon message="暂无性能基准数据。" />}

        {!loading && !error && data && (
          <>
            {/* 总体指标卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总体加权 P95"
                    value={data.overallP95Ms}
                    suffix="ms"
                    valueStyle={{ color: data.overallP95Ms <= p95Limit ? VI.accent : '#cf1322' }}
                  />
                  <Progress
                    percent={Math.min(100, Math.round((data.overallP95Ms / p95Limit) * 100))}
                    size="small"
                    showInfo={false}
                    status={data.overallP95Ms > p95Limit ? 'exception' : 'active'}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总体吞吐"
                    value={data.overallThroughputRps}
                    suffix="req/s"
                    valueStyle={{ color: VI.accent }}
                  />
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    较基线 {data.baseline.throughputRps} req/s
                  </Paragraph>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总体错误率"
                    value={(data.overallErrorRate * 100).toFixed(3)}
                    suffix="%"
                    valueStyle={{ color: data.overallErrorRate <= errLimit ? VI.accent : '#cf1322' }}
                  />
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    门禁线 {(errLimit * 100).toFixed(1)}%
                  </Paragraph>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="生产质量门禁"
                    value={data.gate === 'pass' ? '通过' : data.gate === 'warn' ? '告警' : '未通过'}
                    valueStyle={{
                      color: data.gate === 'pass' ? '#389e0d' : data.gate === 'warn' ? '#d48806' : '#cf1322',
                    }}
                  />
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                    {data.gateNote}
                  </Paragraph>
                </Card>
              </Col>
            </Row>

            {/* 基线对比 */}
            <Card title="版本漂移对比（vs 上一发布基线）" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="P95 变化"
                    value={data.comparison.p95DeltaMs}
                    suffix="ms"
                    prefix={data.comparison.p95Improved ? '↓' : '↑'}
                    valueStyle={{ color: data.comparison.p95Improved ? '#389e0d' : '#cf1322' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="错误率变化"
                    value={`${(data.comparison.errorRateDelta * 100).toFixed(3)}pp`}
                    valueStyle={{ color: data.comparison.errorImproved ? '#389e0d' : '#cf1322' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="吞吐变化"
                    value={data.comparison.throughputDeltaRps}
                    suffix="req/s"
                    valueStyle={{ color: data.comparison.throughputImproved ? '#389e0d' : '#d48806' }}
                  />
                </Col>
              </Row>
              <Paragraph
                style={{
                  marginTop: 16,
                  marginBottom: 0,
                  color: data.comparison.regression ? '#cf1322' : '#389e0d',
                }}
              >
                {data.comparison.regression ? <Tag color="red">劣化回归</Tag> : <Tag color="green">无漂移</Tag>}
                {'　'}
                {data.comparison.conclusion}
              </Paragraph>
            </Card>

            {/* 逐 API 基准明细 */}
            <Card
              title={`逐 API 基准明细（${data.apis.length} 条 · 生成于 ${new Date(data.generatedAt).toLocaleString('zh-CN')}）`}
            >
              <Table
                rowKey="api"
                pagination={false}
                dataSource={data.apis}
                locale={{ emptyText: '暂无基准记录' }}
                columns={[
                  { title: 'API', dataIndex: 'name', width: 140 },
                  {
                    title: '路径',
                    dataIndex: 'api',
                    render: (v: string) => (
                      <Text code style={{ fontSize: 12 }}>
                        {v}
                      </Text>
                    ),
                  },
                  { title: 'P50', dataIndex: 'p50Ms', width: 80, render: (v: number) => `${v} ms` },
                  {
                    title: 'P95',
                    dataIndex: 'p95Ms',
                    width: 110,
                    render: (v: number) => <Tag color={p95TagColor(v, p95Limit)}>{v} ms</Tag>,
                  },
                  { title: 'P99', dataIndex: 'p99Ms', width: 90, render: (v: number) => `${v} ms` },
                  {
                    title: '吞吐',
                    dataIndex: 'throughputRps',
                    width: 110,
                    render: (v: number) => `${v} req/s`,
                  },
                  {
                    title: '错误率',
                    dataIndex: 'errorRate',
                    width: 110,
                    render: (v: number) => (
                      <Tag color={v <= errLimit ? 'green' : 'red'}>{(v * 100).toFixed(2)}%</Tag>
                    ),
                  },
                  {
                    title: '达标',
                    dataIndex: 'gatePassed',
                    width: 90,
                    render: (v: boolean) => (v ? <Tag color="green">达标</Tag> : <Tag color="red">未达标</Tag>),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
