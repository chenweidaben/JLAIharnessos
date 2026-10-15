/**
 * 健澜科技 jlmedaios - M135-C API 性能基准测试面板（仅 admin）
 *
 * 点击「开始基准测试」触发 GET /api/v1/admin/test/performance，
 * 以表格展示每条路由 P50/P95/P99、错误率与吞吐，以分组柱状图对比
 * 三档百分位耗时，并展示「生产就绪质量门禁」判定结论。
 * 三态：loading（测试执行中）/ error（失败可重试）/ empty（未执行）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF generatePerformanceReport 输出对齐 */
interface BaselineComparison {
  p95DeltaMs: number;
  errorRateDelta: number;
  regression: boolean;
}

interface BenchmarkResultRow {
  route: string;
  label: string;
  samples: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  avgMs: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  throughputRps: number;
  vsBaseline: BaselineComparison;
}

interface BenchmarkReportData {
  baseUrl: string;
  concurrency: number;
  samples: number;
  generatedAt: string;
  routeCount: number;
  totalSamples: number;
  totalErrors: number;
  overallErrorRate: number;
  gate: 'pass' | 'warn' | 'fail';
  gateNote: string;
  results: BenchmarkResultRow[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  warn: '#d48806',
  danger: '#cf1322',
  bg: '#f5f7fa',
};

const GATE_TAG: Record<BenchmarkReportData['gate'], { color: string; text: string }> = {
  pass: { color: 'green', text: '通过' },
  warn: { color: 'orange', text: '告警' },
  fail: { color: 'red', text: '未通过' },
};

function p95Tag(ms: number): 'green' | 'orange' | 'red' {
  // 与生产就绪质量门禁对齐：P95 ≤ 500ms 为硬上限
  if (ms <= 200) return 'green';
  if (ms <= 500) return 'orange';
  return 'red';
}

function errorRateTag(rate: number): 'green' | 'orange' | 'red' {
  // 门禁硬上限 1%
  if (rate <= 0.005) return 'green';
  if (rate <= 0.01) return 'orange';
  return 'red';
}

export default function PerformanceBenchmarkPage() {
  const [data, setData] = useState<BenchmarkReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runBenchmark = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/performance');
      const body = await resp.json();
      if (body.code !== 0) {
        setError(body.message || '基准测试失败');
        setData(null);
        return;
      }
      setData(body.data as BenchmarkReportData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /** 分组柱状图：每条路由 P50 / P95 / P99 对比 */
  const barOption = data
    ? {
        color: [VI.accentSoft, VI.accent, VI.deep],
        tooltip: { trigger: 'axis' as const },
        legend: { data: ['P50', 'P95', 'P99'] },
        grid: { left: 48, right: 24, top: 40, bottom: 40 },
        xAxis: {
          type: 'category' as const,
          data: data.results.map((r) => r.label),
        },
        yAxis: { type: 'value' as const, name: 'ms' },
        series: [
          { name: 'P50', type: 'bar' as const, data: data.results.map((r) => r.p50Ms) },
          { name: 'P95', type: 'bar' as const, data: data.results.map((r) => r.p95Ms) },
          { name: 'P99', type: 'bar' as const, data: data.results.map((r) => r.p99Ms) },
        ],
      }
    : null;

  const columns: ColumnsType<BenchmarkResultRow> = [
    { title: '路由', dataIndex: 'label', ellipsis: true },
    { title: '样本数', dataIndex: 'samples', width: 80 },
    {
      title: 'P50',
      dataIndex: 'p50Ms',
      width: 100,
      render: (v: number) => `${v} ms`,
    },
    {
      title: 'P95',
      dataIndex: 'p95Ms',
      width: 110,
      render: (v: number) => <Tag color={p95Tag(v)}>{v} ms</Tag>,
    },
    {
      title: 'P99',
      dataIndex: 'p99Ms',
      width: 100,
      render: (v: number) => `${v} ms`,
    },
    {
      title: '平均',
      dataIndex: 'avgMs',
      width: 100,
      render: (v: number) => `${v} ms`,
    },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      width: 110,
      render: (v: number) => (
        <Tag color={errorRateTag(v)}>{(v * 100).toFixed(2)}%</Tag>
      ),
    },
    {
      title: '吞吐(RPS)',
      dataIndex: 'throughputRps',
      width: 110,
      render: (v: number) => v,
    },
    {
      title: '基线对比',
      dataIndex: 'vsBaseline',
      width: 130,
      render: (v: BaselineComparison) =>
        v.regression ? (
          <Tag color="red">劣化 +{v.p95DeltaMs}ms</Tag>
        ) : (
          <Tag color="green">正常</Tag>
        ),
    },
  ];

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
          仅 admin 可见 · P50/P95/P99 与错误率 · 生产就绪质量门禁判定
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* 操作条 */}
        <Card style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={runBenchmark}
            style={{ background: VI.accent, borderColor: VI.accent }}
          >
            {loading ? '基准测试执行中…' : '开始基准测试'}
          </Button>
          {data && (
            <span style={{ marginLeft: 16, color: '#666' }}>
              {data.baseUrl} · 并发 {data.concurrency} · 每路由 {data.samples} 样本 ·{' '}
              {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在采样并统计百分位…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={runBenchmark}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Alert
            type="info"
            showIcon
            message="点击「开始基准测试」对核心 GET 端点执行一次压测采样，结果将与内置基线对比并给出门禁结论。"
          />
        )}

        {!loading && !error && data && (
          <>
            {/* 门禁结论卡 */}
            <Alert
              type={data.gate === 'pass' ? 'success' : data.gate === 'warn' ? 'warning' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
              message={`生产就绪质量门禁：${GATE_TAG[data.gate].text}`}
              description={data.gateNote}
            />

            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="受测路由数" value={data.routeCount} suffix="条" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="总样本数" value={data.totalSamples} suffix="次" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总错误数"
                    value={data.totalErrors}
                    valueStyle={{ color: data.totalErrors > 0 ? VI.danger : undefined }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总体错误率"
                    value={(data.overallErrorRate * 100).toFixed(2)}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>

            {/* 百分位柱状图 */}
            <Card title="P50 / P95 / P99 耗时对比（ms）" style={{ marginBottom: 16 }}>
              {barOption && <ReactECharts option={barOption} style={{ height: 320 }} />}
            </Card>

            {/* 明细表 */}
            <Card title="路由基准明细">
              <Table
                rowKey="route"
                pagination={false}
                dataSource={data.results}
                columns={columns}
                locale={{ emptyText: '暂无基准数据' }}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
