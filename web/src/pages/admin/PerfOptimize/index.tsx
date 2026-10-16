/**
 * 健澜科技 jlmedaios - M171-D 系统性能与稳定性持续优化页（仅 admin）
 *
 * 【科研教学后勤】展示 GET /api/v1/admin/performance/deep-optimize 返回：
 *  - 慢查询 TOP10 优化（加索引 + 改写SQL + 批量加载，含 before/after 与收益）；
 *  - 数据库连接池优化（最大连接数 + 超时 + 重试）；
 *  - 缓存策略优化（缓存键 + 过期 + 失效 + 预热 + 命中率）；
 *  - 前端性能优化（懒加载 + 代码分割 + 预加载）；
 *  - 基准对比（optimized baseline vs current）、退化检测、SLO 达成。
 *
 * 性能优化要有数据：所有数字均来自 BFF 确定性采样，不凭感觉。
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF PerfDeepOptimizeView 对齐的类型 ---------------- */

type SlowQueryLever = 'ADD_INDEX' | 'REWRITE_SQL' | 'BATCH_LOAD';

interface SlowQueryTopOpt {
  rank: number;
  id: string;
  table: string;
  pattern: string;
  beforeMs: number;
  afterMs: number;
  callsPerDay: number;
  levers: SlowQueryLever[];
  leverLabels: string[];
  savedMs: number;
  savedPct: number;
}

interface PoolSide {
  max: number;
  acquireTimeoutMs: number;
  idleTimeoutSec: number;
  waitPerMin: number;
  waitP95Ms: number;
}

interface ConnectionPool {
  before: PoolSide;
  after: PoolSide;
  retry: { attempts: number; backoffBaseMs: number; policy: string };
  notes: string[];
}

interface CacheRule {
  key: string;
  scope: string;
  ttlSec: number;
  invalidation: string;
  warmup: boolean;
  hitRateBeforePct: number;
  hitRateAfterPct: number;
}

interface FrontendItem {
  area: string;
  before: string;
  after: string;
  effect: string;
}

interface DeepOptimization {
  slowQueryTop10: SlowQueryTopOpt[];
  connectionPool: ConnectionPool;
  cacheStrategy: {
    rules: CacheRule[];
    summary: { avgHitRateBeforePct: number; avgHitRateAfterPct: number; warmupKeys: number };
  };
  frontend: {
    items: FrontendItem[];
    summary: { bundleKbBefore: number; bundleKbAfter: number; lcpBeforeMs: number; lcpAfterMs: number };
  };
  summary: {
    slowQueryTotalSavedMsPerDay: number;
    p95BeforeMs: number;
    p95AfterMs: number;
    overallVerdict: 'improved';
  };
}

interface PerfSample {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  errorRatePct: number;
  throughputRps: number;
}

interface Benchmark {
  baseline: PerfSample;
  current: PerfSample;
  delta: Record<'p50Ms' | 'p95Ms' | 'p99Ms' | 'avgMs' | 'errorRatePct' | 'throughputRps', number>;
  pct: Record<'p50' | 'p95' | 'p99' | 'avg' | 'errorRate' | 'throughput', number>;
  verdict: 'faster' | 'slower' | 'same';
  p95Improved: boolean;
  errorRateNotWorse: boolean;
}

interface RegressionSignal {
  metric: 'p95Ms' | 'errorRatePct';
  current: number;
  threshold: number;
  deviationPct: number;
  severity: 'warning' | 'critical';
}

interface Regression {
  regressed: boolean;
  signals: RegressionSignal[];
  baseline: { p95Ms: number; errorRatePct: number };
  windows: { window: string; p95Ms: number; errorRatePct: number }[];
}

interface SLO {
  errorRate: { targetPct: number; actualPct: number; met: boolean };
  latency: { p95TargetMs: number; actualMs: number; met: boolean };
  availability: { targetPct: number; actualPct: number; met: boolean };
  overall: { status: 'met' | 'at_risk' | 'breached'; score: number; errorBurnRate: number };
  lookback: string;
}

interface PerfDeepOptimizeView {
  optimization: DeepOptimization;
  benchmark: Benchmark;
  regression: Regression;
  slo: SLO;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const LEVER_COLOR: Record<SlowQueryLever, string> = {
  ADD_INDEX: 'gold',
  REWRITE_SQL: 'purple',
  BATCH_LOAD: 'geekblue',
};

const fmtInt = (v: number): string => v.toLocaleString('zh-CN');
/** 秒 → 人类可读 TTL */
const fmtTtl = (sec: number): string => {
  if (sec >= 86400) return `${Math.round(sec / 86400)}天`;
  if (sec >= 3600) return `${Math.round(sec / 3600)}时`;
  return `${sec}秒`;
};

export default function PerfOptimizePage() {
  const [data, setData] = useState<PerfDeepOptimizeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/deep-optimize');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PerfDeepOptimizeView);
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

  const opt = data?.optimization;
  const bench = data?.benchmark;
  const reg = data?.regression;
  const slo = data?.slo;

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
          深度性能优化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【科研教学后勤】慢查询 TOP10 · 连接池 · 缓存策略 · 前端性能 · 基准对比 · 退化检测 ·
          SLO —— 性能优化要有数据，不凭感觉
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载深度性能优化数据中…" />
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
          <Alert type="info" showIcon message="暂无深度性能优化数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 汇总指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="P95 延迟"
                    value={opt?.summary.p95AfterMs ?? 0}
                    suffix="ms"
                    prefix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>{opt?.summary.p95BeforeMs ?? 0}→</span>}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="TOP10 日省耗时"
                    value={fmtInt(opt?.summary.slowQueryTotalSavedMsPerDay ?? 0)}
                    suffix="ms/日"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="缓存命中率"
                    value={opt?.cacheStrategy.summary.avgHitRateAfterPct ?? 0}
                    suffix="%"
                    prefix={
                      <span style={{ fontSize: 14, color: '#8c8c8c' }}>
                        {opt?.cacheStrategy.summary.avgHitRateBeforePct ?? 0}→
                      </span>
                    }
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="LCP"
                    value={opt?.frontend.summary.lcpAfterMs ?? 0}
                    suffix="ms"
                    prefix={
                      <span style={{ fontSize: 14, color: '#8c8c8c' }}>
                        {opt?.frontend.summary.lcpBeforeMs ?? 0}→
                      </span>
                    }
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="基准判定"
                    value={bench?.verdict ?? '-'}
                    valueStyle={{ color: bench?.verdict === 'faster' ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="SLO"
                    value={slo?.overall.status ?? '-'}
                    valueStyle={{
                      color:
                        slo?.overall.status === 'met' ? '#3f8600' : slo?.overall.status === 'at_risk' ? '#d48806' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 慢查询 TOP10 */}
            <Card title="慢查询 TOP10 优化（加索引 + 改写SQL + 批量加载）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={opt?.slowQueryTop10 ?? []}
                size="small"
                locale={{ emptyText: '暂无慢查询' }}
                columns={[
                  { title: '#', dataIndex: 'rank', width: 45 },
                  { title: '表', dataIndex: 'table', width: 190, render: (v: string) => <Tag color="blue">{v}</Tag> },
                  { title: '查询模式', dataIndex: 'pattern', ellipsis: true },
                  {
                    title: '手段',
                    dataIndex: 'levers',
                    width: 170,
                    render: (levers: SlowQueryLever[]) => (
                      <span>
                        {levers.map((l) => (
                          <Tag key={l} color={LEVER_COLOR[l]} style={{ marginBottom: 2 }}>
                            {l}
                          </Tag>
                        ))}
                      </span>
                    ),
                  },
                  {
                    title: 'avg(ms)',
                    width: 130,
                    render: (_: unknown, r: SlowQueryTopOpt) => (
                      <span>
                        <span style={{ color: '#8c8c8c' }}>{r.beforeMs}</span>
                        {' → '}
                        <span style={{ color: '#3f8600', fontWeight: 600 }}>{r.afterMs}</span>
                      </span>
                    ),
                  },
                  { title: '节省', dataIndex: 'savedPct', width: 80, render: (v: number) => `${v}%` },
                  { title: '次/日', dataIndex: 'callsPerDay', width: 80, render: fmtInt },
                ]}
              />
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 连接池 */}
              <Col span={12}>
                <Card title="数据库连接池优化（最大连接数 + 超时 + 重试）" size="small">
                  <Table
                    rowKey="metric"
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无连接池数据' }}
                    dataSource={[
                      { metric: '最大连接数', before: String(opt?.connectionPool.before.max ?? '-'), after: String(opt?.connectionPool.after.max ?? '-'), unit: '' },
                      { metric: '获取超时', before: `${opt?.connectionPool.before.acquireTimeoutMs ?? '-'}ms`, after: `${opt?.connectionPool.after.acquireTimeoutMs ?? '-'}ms`, unit: '' },
                      { metric: '空闲回收', before: `${opt?.connectionPool.before.idleTimeoutSec ?? '-'}s`, after: `${opt?.connectionPool.after.idleTimeoutSec ?? '-'}s`, unit: '' },
                      { metric: '等待数/分', before: String(opt?.connectionPool.before.waitPerMin ?? '-'), after: String(opt?.connectionPool.after.waitPerMin ?? '-'), unit: '' },
                      { metric: '等待 P95', before: `${opt?.connectionPool.before.waitP95Ms ?? '-'}ms`, after: `${opt?.connectionPool.after.waitP95Ms ?? '-'}ms`, unit: '' },
                    ]}
                    columns={[
                      { title: '指标', dataIndex: 'metric', width: 110 },
                      { title: '优化前', dataIndex: 'before', width: 110, render: (v: string) => <span style={{ color: '#cf1322' }}>{v}</span> },
                      { title: '优化后', dataIndex: 'after', width: 110, render: (v: string) => <span style={{ color: '#3f8600', fontWeight: 600 }}>{v}</span> },
                    ]}
                  />
                  <Paragraph style={{ marginTop: 12, fontSize: 12, color: '#595959' }}>
                    重试：{opt?.connectionPool.retry.attempts ?? 0} 次，退避 {opt?.connectionPool.retry.backoffBaseMs ?? 0}ms 起。
                    {opt?.connectionPool.retry.policy}
                  </Paragraph>
                </Card>
              </Col>

              {/* 缓存策略 */}
              <Col span={12}>
                <Card
                  title={`缓存策略（命中率 ${opt?.cacheStrategy.summary.avgHitRateBeforePct ?? 0}% → ${opt?.cacheStrategy.summary.avgHitRateAfterPct ?? 0}%，预热 ${opt?.cacheStrategy.summary.warmupKeys ?? 0} 键）`}
                  size="small"
                >
                  <Table
                    rowKey="key"
                    pagination={false}
                    dataSource={opt?.cacheStrategy.rules ?? []}
                    size="small"
                    locale={{ emptyText: '暂无缓存规则' }}
                    columns={[
                      { title: '缓存键', dataIndex: 'key', width: 240, ellipsis: true },
                      { title: '作用域', dataIndex: 'scope', width: 90 },
                      { title: '过期', dataIndex: 'ttlSec', width: 70, render: (v: number) => fmtTtl(v) },
                      { title: '预热', dataIndex: 'warmup', width: 60, render: (v: boolean) => (v ? <Tag color="green">预热</Tag> : <Tag>-</Tag>) },
                      {
                        title: '命中率',
                        width: 120,
                        render: (_: unknown, r: CacheRule) => (
                          <span>
                            <span style={{ color: '#8c8c8c' }}>{r.hitRateBeforePct}%</span>
                            {'→'}
                            <span style={{ color: '#3f8600', fontWeight: 600 }}>{r.hitRateAfterPct}%</span>
                          </span>
                        ),
                      },
                      { title: '失效', dataIndex: 'invalidation', ellipsis: true },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            {/* 前端性能 */}
            <Card
              title={`前端性能优化（懒加载 + 代码分割 + 预加载）：bundle ${opt?.frontend.summary.bundleKbBefore ?? 0}KB → ${opt?.frontend.summary.bundleKbAfter ?? 0}KB`}
              style={{ marginBottom: 16 }}
            >
              <Table
                rowKey="area"
                pagination={false}
                dataSource={opt?.frontend.items ?? []}
                size="small"
                locale={{ emptyText: '暂无前端优化项' }}
                columns={[
                  { title: '优化项', dataIndex: 'area', width: 140 },
                  { title: '优化前', dataIndex: 'before', ellipsis: true },
                  { title: '优化后', dataIndex: 'after', ellipsis: true },
                  { title: '效果', dataIndex: 'effect', width: 200, render: (v: string) => <Tag color="green">{v}</Tag> },
                ]}
              />
            </Card>

            <Row gutter={16}>
              {/* 基准对比 */}
              <Col span={8}>
                <Card title="性能基准对比" size="small">
                  <Table
                    rowKey="metric"
                    pagination={false}
                    size="small"
                    dataSource={[
                      { metric: 'P50(ms)', base: bench?.baseline.p50Ms, cur: bench?.current.p50Ms },
                      { metric: 'P95(ms)', base: bench?.baseline.p95Ms, cur: bench?.current.p95Ms },
                      { metric: 'P99(ms)', base: bench?.baseline.p99Ms, cur: bench?.current.p99Ms },
                      { metric: '错误率(%)', base: bench?.baseline.errorRatePct, cur: bench?.current.errorRatePct },
                      { metric: '吞吐(rps)', base: bench?.baseline.throughputRps, cur: bench?.current.throughputRps },
                    ]}
                    columns={[
                      { title: '指标', dataIndex: 'metric', width: 100 },
                      { title: '基线', dataIndex: 'base', width: 70 },
                      { title: '现状', dataIndex: 'cur', width: 70, render: (v: number) => <b>{v}</b> },
                    ]}
                  />
                  <Paragraph style={{ marginTop: 8, fontSize: 12 }}>
                    判定：<Tag color={bench?.verdict === 'faster' ? 'green' : 'red'}>{bench?.verdict}</Tag>
                    P95 变化 {bench?.pct.p95}%，吞吐 {bench?.pct.throughput}%
                  </Paragraph>
                </Card>
              </Col>

              {/* 退化检测 */}
              <Col span={8}>
                <Card
                  title={`性能退化检测（基线 P95 ${reg?.baseline.p95Ms ?? 0}ms）`}
                  size="small"
                >
                  {reg?.regressed ? (
                    <Alert type="warning" showIcon message="检测到性能退化" style={{ marginBottom: 8 }} />
                  ) : (
                    <Alert type="success" showIcon message="无退化：现状优于近 7 日基线" style={{ marginBottom: 8 }} />
                  )}
                  <Table
                    rowKey="window"
                    pagination={false}
                    size="small"
                    dataSource={reg?.windows ?? []}
                    columns={[
                      { title: '窗口', dataIndex: 'window', width: 60 },
                      { title: 'P95(ms)', dataIndex: 'p95Ms', width: 80 },
                      { title: '错误率(%)', dataIndex: 'errorRatePct', width: 90 },
                    ]}
                  />
                </Card>
              </Col>

              {/* SLO */}
              <Col span={8}>
                <Card title={`SLO 达成（${slo?.lookback ?? '30d'}）`} size="small">
                  <Statistic
                    title="综合达成率"
                    value={slo?.overall.score ?? 0}
                    suffix="%"
                    valueStyle={{ color: slo?.overall.status === 'met' ? '#3f8600' : '#d48806' }}
                  />
                  <Table
                    rowKey="name"
                    pagination={false}
                    size="small"
                    style={{ marginTop: 8 }}
                    dataSource={[
                      { name: '错误率', actual: `${slo?.errorRate.actualPct}%`, target: `≤${slo?.errorRate.targetPct}%`, met: slo?.errorRate.met },
                      { name: 'P95 延迟', actual: `${slo?.latency.actualMs}ms`, target: `≤${slo?.latency.p95TargetMs}ms`, met: slo?.latency.met },
                      { name: '可用率', actual: `${slo?.availability.actualPct}%`, target: `≥${slo?.availability.targetPct}%`, met: slo?.availability.met },
                    ]}
                    columns={[
                      { title: '指标', dataIndex: 'name', width: 80 },
                      { title: '现状', dataIndex: 'actual', width: 80 },
                      { title: '目标', dataIndex: 'target', width: 90 },
                      {
                        title: '达成',
                        dataIndex: 'met',
                        width: 60,
                        render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '达标' : '未达'}</Tag>,
                      },
                    ]}
                  />
                  <Paragraph style={{ marginTop: 8, fontSize: 12 }}>
                    错误率消耗速率：{slo?.overall.errorBurnRate}x
                  </Paragraph>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
