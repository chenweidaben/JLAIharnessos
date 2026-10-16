/**
 * 健澜科技 jlmedaios - M180-D 系统性能与稳定性持续优化 V2 面板（仅 admin）
 *
 * 【质量与体验】展示 GET /api/v1/admin/performance/v2 返回的四组数据：
 *  - 数据库索引优化：慢查询 TOP10 + 索引建议（btree/覆盖/部分/GIN）；
 *  - 查询缓存优化：缓存键 + TTL + 失效 + 预热 + 命中率前后对比；
 *  - 前端性能优化：路由懒加载 + 代码分割 + 关键路由预加载 + CDN；
 *  - 服务器优化：连接池 + 线程池 + JVM/Node 参数 + OS 内核参数；
 *  - 五维基准对比 + 三维退化检测 + SLO 达成。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 深海蓝 VI ---------------- */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/* ---------------- 与 BFF PerfOptV2View 输出对齐的类型 ---------------- */

interface SlowQueryTopRowV2 {
  rank: number;
  id: string;
  table: string;
  pattern: string;
  beforeMs: number;
  afterMs: number;
  callsPerDay: number;
  savedMs: number;
  savedPct: number;
}

interface IndexRecommendationV2 {
  id: string;
  table: string;
  columns: string[];
  kind: 'btree' | 'covering' | 'partial' | 'gin';
  indexName: string;
  scannedRowsBeforePerDay: number;
  scannedRowsAfterPerDay: number;
  expectedMsSaving: number;
  writeAmplification: 'low' | 'medium' | 'high';
  rationale: string;
}

interface CacheRuleV2 {
  key: string;
  scope: string;
  ttlSec: number;
  invalidation: string;
  warmup: boolean;
  hitRateBeforePct: number;
  hitRateAfterPct: number;
}

interface FrontendPerfItemV2 {
  area: string;
  before: string;
  after: string;
  effect: string;
}

interface RuntimeParamV2 {
  key: string;
  before: string;
  after: string;
  rationale: string;
}

interface OsParamV2 {
  key: string;
  before: string;
  after: string;
  rationale: string;
}

interface DeepPerformanceV2Report {
  indexing: {
    slowQueryTop10: SlowQueryTopRowV2[];
    indexRecommendations: IndexRecommendationV2[];
    summary: {
      slowQueryTotalSavedMsPerDay: number;
      indexCount: number;
      rowsReducedPerDay: number;
    };
  };
  cache: {
    rules: CacheRuleV2[];
    summary: {
      avgHitRateBeforePct: number;
      avgHitRateAfterPct: number;
      warmupKeys: number;
    };
  };
  frontend: {
    items: FrontendPerfItemV2[];
    summary: {
      bundleKbBefore: number;
      bundleKbAfter: number;
      lcpBeforeMs: number;
      lcpAfterMs: number;
      ttfBAfterPct: number;
    };
  };
  server: {
    connectionPool: {
      before: { max: number; acquireTimeoutMs: number; idleTimeoutSec: number; waitPerMin: number; waitP95Ms: number };
      after: { max: number; acquireTimeoutMs: number; idleTimeoutSec: number; waitPerMin: number; waitP95Ms: number };
      retry: { attempts: number; backoffBaseMs: number; policy: string };
    };
    threadPool: {
      before: { eventLoopLagP95Ms: number; pendingTasks: number; workerThreads: number; maxEventListeners: number };
      after: { eventLoopLagP95Ms: number; pendingTasks: number; workerThreads: number; maxEventListeners: number };
    };
    runtimeParams: RuntimeParamV2[];
    osParams: OsParamV2[];
  };
  summary: { p95BeforeMs: number; p95AfterMs: number; overallVerdict: 'improved' };
}

interface PerfSampleV2 {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  errorRatePct: number;
  throughputRps: number;
}

interface BenchmarkV2Result {
  baseline: PerfSampleV2;
  current: PerfSampleV2;
  delta: Record<string, number>;
  pct: Record<string, number>;
  verdict: 'faster' | 'slower' | 'same';
  p95Improved: boolean;
  throughputImproved: boolean;
  errorRateNotWorse: boolean;
}

interface RegressionSignalV2 {
  metric: 'p95Ms' | 'errorRatePct' | 'throughputRps';
  current: number;
  threshold: number;
  deviationPct: number;
  severity: 'warning' | 'critical';
}

interface RegressionV2Result {
  regressed: boolean;
  signals: RegressionSignalV2[];
  baseline: { p95Ms: number; errorRatePct: number; throughputRps: number };
  windows: Array<{ window: string; p95Ms: number; errorRatePct: number; throughputRps: number }>;
}

interface SLOV2 {
  errorRate: { targetPct: number; actualPct: number; met: boolean };
  latency: { p95TargetMs: number; actualMs: number; met: boolean };
  availability: { targetPct: number; actualPct: number; met: boolean };
  overall: { status: 'met' | 'at_risk' | 'breached'; score: number; errorBurnRate: number };
  lookback: string;
}

interface PerfOptV2View {
  optimization: DeepPerformanceV2Report;
  benchmark: BenchmarkV2Result;
  regression: RegressionV2Result;
  slo: SLOV2;
}

/* ---------------- 展示辅助 ---------------- */

const INDEX_KIND_COLOR: Record<IndexRecommendationV2['kind'], string> = {
  btree: 'blue',
  covering: 'geekblue',
  partial: 'cyan',
  gin: 'purple',
};

const WRITE_AMP_COLOR: Record<IndexRecommendationV2['writeAmplification'], string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const VERDICT_COLOR: Record<BenchmarkV2Result['verdict'], string> = {
  faster: 'green',
  slower: 'red',
  same: 'default',
};

const SEVERITY_COLOR: Record<RegressionSignalV2['severity'], string> = {
  warning: 'orange',
  critical: 'red',
};

const SLO_STATUS_COLOR: Record<SLOV2['overall']['status'], string> = {
  met: 'green',
  at_risk: 'orange',
  breached: 'red',
};

/** 千分位格式化 */
const fmtInt = (v: number): string => v.toLocaleString('zh-CN');

/** TTL 友好展示 */
const fmtTtl = (sec: number): string => {
  if (sec >= 86400) return `${Math.round(sec / 86400)}d`;
  if (sec >= 3600) return `${Math.round(sec / 3600)}h`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return `${sec}s`;
};

export default function PerfOptV2Page() {
  const [data, setData] = useState<PerfOptV2View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/v2');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PerfOptV2View);
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
  const bm = data?.benchmark;
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
          性能优化 V2
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【质量与体验】索引优化 · 查询缓存 · 前端（懒加载/代码分割/预加载/CDN）·
          服务器（连接池/线程池/运行时/OS）· 基准对比 · 退化检测 · SLO · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载性能优化 V2 数据中…" />
          </div>
        )}

        {/* error 态 */}
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

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无性能优化 V2 数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && opt && (
          <>
            {/* 汇总指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <Statistic title="P95 延迟（前→后）" value={`${opt.summary.p95BeforeMs}→${opt.summary.p95AfterMs}ms`} />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="TOP10 日节省耗时"
                    value={fmtInt(opt.indexing.summary.slowQueryTotalSavedMsPerDay)}
                    suffix="ms/日"
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="索引建议条数"
                    value={opt.indexing.summary.indexCount}
                    suffix="条"
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="缓存平均命中率"
                    value={`${opt.cache.summary.avgHitRateBeforePct}→${opt.cache.summary.avgHitRateAfterPct}%`}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="基准判定"
                    value={bm?.verdict === 'faster' ? '变快' : bm?.verdict === 'slower' ? '变慢' : '持平'}
                  />
                </Card>
              </Col>
            </Row>

            {/* SLO 状态条 */}
            {slo && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                  <Col>
                    <Text strong>SLO（{slo.lookback}）：</Text>
                    <Tag color={SLO_STATUS_COLOR[slo.overall.status]} style={{ marginLeft: 8 }}>
                      {slo.overall.status === 'met' ? '全部达成' : slo.overall.status === 'at_risk' ? '有风险' : '已破线'}
                    </Tag>
                  </Col>
                  <Col>
                    <Text type="secondary">错误率</Text>
                    <Tag color={slo.errorRate.met ? 'green' : 'red'} style={{ marginLeft: 4 }}>
                      {slo.errorRate.actualPct}% / 目标 ≤{slo.errorRate.targetPct}%
                    </Tag>
                  </Col>
                  <Col>
                    <Text type="secondary">P95 延迟</Text>
                    <Tag color={slo.latency.met ? 'green' : 'red'} style={{ marginLeft: 4 }}>
                      {slo.latency.actualMs}ms / 目标 ≤{slo.latency.p95TargetMs}ms
                    </Tag>
                  </Col>
                  <Col>
                    <Text type="secondary">可用率</Text>
                    <Tag color={slo.availability.met ? 'green' : 'red'} style={{ marginLeft: 4 }}>
                      {slo.availability.actualPct}% / 目标 ≥{slo.availability.targetPct}%
                    </Tag>
                  </Col>
                  <Col>
                    <Text type="secondary">错误预算消耗速率</Text>
                    <Text strong style={{ marginLeft: 4 }}>{slo.overall.errorBurnRate}×</Text>
                  </Col>
                </Row>
              </Card>
            )}

            {/* 1) 数据库索引优化：慢查询 TOP10 */}
            <Card title="① 数据库索引优化 · 慢查询 TOP10" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="rank"
                size="small"
                pagination={false}
                dataSource={opt.indexing.slowQueryTop10}
                columns={[
                  { title: '#', dataIndex: 'rank', width: 50 },
                  { title: '表', dataIndex: 'table', width: 200 },
                  { title: '查询模式', dataIndex: 'pattern' },
                  { title: '前(ms)', dataIndex: 'beforeMs', width: 80, render: (v: number) => <Text type="danger">{v}</Text> },
                  { title: '后(ms)', dataIndex: 'afterMs', width: 80, render: (v: number) => <Text type="success">{v}</Text> },
                  { title: '次/日', dataIndex: 'callsPerDay', width: 90, render: (v: number) => fmtInt(v) },
                  { title: '节省%', dataIndex: 'savedPct', width: 80, render: (v: number) => <Tag color="green">-{v}%</Tag> },
                ]}
              />
            </Card>

            {/* 1) 索引建议 */}
            <Card title="① 数据库索引优化 · 索引建议" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={opt.indexing.indexRecommendations}
                columns={[
                  { title: '表', dataIndex: 'table', width: 180 },
                  { title: '索引名', dataIndex: 'indexName', width: 240 },
                  { title: '列', dataIndex: 'columns', render: (cols: string[]) => cols.join(', ') },
                  { title: '类型', dataIndex: 'kind', width: 90, render: (k: IndexRecommendationV2['kind']) => <Tag color={INDEX_KIND_COLOR[k]}>{k}</Tag> },
                  {
                    title: '扫描行/日（前→后）',
                    width: 180,
                    render: (_: unknown, row: IndexRecommendationV2) =>
                      `${fmtInt(row.scannedRowsBeforePerDay)} → ${fmtInt(row.scannedRowsAfterPerDay)}`,
                  },
                  { title: '预期节省(ms)', dataIndex: 'expectedMsSaving', width: 110 },
                  {
                    title: '写放大',
                    dataIndex: 'writeAmplification',
                    width: 90,
                    render: (w: IndexRecommendationV2['writeAmplification']) => <Tag color={WRITE_AMP_COLOR[w]}>{w}</Tag>,
                  },
                  { title: '依据', dataIndex: 'rationale' },
                ]}
              />
              <Text type="secondary">
                合计每日扫描行数下降：{fmtInt(opt.indexing.summary.rowsReducedPerDay)} 行
              </Text>
            </Card>

            {/* 2) 查询缓存 */}
            <Card title="② 查询缓存优化（缓存键 + 过期 + 失效 + 预热）" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={opt.cache.rules}
                columns={[
                  { title: '业务域', dataIndex: 'scope', width: 120 },
                  { title: '缓存键模式', dataIndex: 'key' },
                  { title: 'TTL', dataIndex: 'ttlSec', width: 80, render: (v: number) => fmtTtl(v) },
                  { title: '失效策略', dataIndex: 'invalidation' },
                  {
                    title: '预热',
                    dataIndex: 'warmup',
                    width: 70,
                    render: (w: boolean) => (w ? <Tag color="blue">预热</Tag> : <Tag>按需</Tag>),
                  },
                  {
                    title: '命中率(前→后)',
                    width: 160,
                    render: (_: unknown, row: CacheRuleV2) => `${row.hitRateBeforePct}% → ${row.hitRateAfterPct}%`,
                  },
                ]}
              />
              <Text type="secondary">
                平均命中率 {opt.cache.summary.avgHitRateBeforePct}% → {opt.cache.summary.avgHitRateAfterPct}%；预热键 {opt.cache.summary.warmupKeys} 个
              </Text>
            </Card>

            {/* 3) 前端性能 */}
            <Card title="③ 前端性能优化（懒加载 + 代码分割 + 预加载 + CDN）" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <Statistic title="JS 包体积(前→后)" value={`${opt.frontend.summary.bundleKbBefore}→${opt.frontend.summary.bundleKbAfter}KB`} />
                </Col>
                <Col span={6}>
                  <Statistic title="LCP(前→后)" value={`${opt.frontend.summary.lcpBeforeMs}→${opt.frontend.summary.lcpAfterMs}ms`} />
                </Col>
                <Col span={6}>
                  <Statistic title="CDN 后跨网 TTFB 优化" value={`-${opt.frontend.summary.ttfBAfterPct}%`} />
                </Col>
              </Row>
              <Table
                rowKey="area"
                size="small"
                pagination={false}
                dataSource={opt.frontend.items}
                columns={[
                  { title: '优化项', dataIndex: 'area', width: 160 },
                  { title: '优化前', dataIndex: 'before' },
                  { title: '优化后', dataIndex: 'after' },
                  { title: '收益', dataIndex: 'effect', width: 220 },
                ]}
              />
            </Card>

            {/* 4) 服务器优化 */}
            <Card title="④ 服务器优化（连接池 + 线程池 + 运行时 + OS）" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Card size="small" title="数据库连接池">
                    <Row gutter={8}>
                      <Col span={8}>
                        <Statistic title="max 连接" value={`${opt.server.connectionPool.before.max}→${opt.server.connectionPool.after.max}`} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="等待P95(ms)" value={`${opt.server.connectionPool.before.waitP95Ms}→${opt.server.connectionPool.after.waitP95Ms}`} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="获取超时(ms)" value={`${opt.server.connectionPool.before.acquireTimeoutMs}→${opt.server.connectionPool.after.acquireTimeoutMs}`} />
                      </Col>
                    </Row>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      重试：最多 {opt.server.connectionPool.retry.attempts} 次，退避基数 {opt.server.connectionPool.retry.backoffBaseMs}ms
                    </Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="BFF 线程池 / 事件循环">
                    <Row gutter={8}>
                      <Col span={8}>
                        <Statistic title="事件循环P95滞后(ms)" value={`${opt.server.threadPool.before.eventLoopLagP95Ms}→${opt.server.threadPool.after.eventLoopLagP95Ms}`} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="待处理任务" value={`${opt.server.threadPool.before.pendingTasks}→${opt.server.threadPool.after.pendingTasks}`} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="worker 线程" value={`${opt.server.threadPool.before.workerThreads}→${opt.server.threadPool.after.workerThreads}`} />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Table
                    rowKey="key"
                    size="small"
                    pagination={false}
                    title={() => <Text strong>运行时参数（Node / JVM）</Text>}
                    dataSource={opt.server.runtimeParams}
                    columns={[
                      { title: '参数', dataIndex: 'key' },
                      { title: '前', dataIndex: 'before' },
                      { title: '后', dataIndex: 'after' },
                      { title: '依据', dataIndex: 'rationale' },
                    ]}
                  />
                </Col>
                <Col span={12}>
                  <Table
                    rowKey="key"
                    size="small"
                    pagination={false}
                    title={() => <Text strong>OS 内核参数</Text>}
                    dataSource={opt.server.osParams}
                    columns={[
                      { title: '参数', dataIndex: 'key' },
                      { title: '前', dataIndex: 'before' },
                      { title: '后', dataIndex: 'after' },
                      { title: '依据', dataIndex: 'rationale' },
                    ]}
                  />
                </Col>
              </Row>
            </Card>

            {/* 基准对比 + 退化检测 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="五维基准对比" size="small">
                  {bm && (
                    <>
                      <p>
                        判定：<Tag color={VERDICT_COLOR[bm.verdict]}>{bm.verdict}</Tag>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          P95 {bm.pct.p95}% / 吞吐 {bm.pct.throughput}% / 错误率 {bm.pct.errorRate}%
                        </Text>
                      </p>
                      <Table
                        rowKey="metric"
                        size="small"
                        pagination={false}
                        dataSource={[
                          { metric: 'P50(ms)', baseline: bm.baseline.p50Ms, current: bm.current.p50Ms },
                          { metric: 'P95(ms)', baseline: bm.baseline.p95Ms, current: bm.current.p95Ms },
                          { metric: 'P99(ms)', baseline: bm.baseline.p99Ms, current: bm.current.p99Ms },
                          { metric: '错误率(%)', baseline: bm.baseline.errorRatePct, current: bm.current.errorRatePct },
                          { metric: '吞吐(rps)', baseline: bm.baseline.throughputRps, current: bm.current.throughputRps },
                        ]}
                        columns={[
                          { title: '指标', dataIndex: 'metric' },
                          { title: '基线', dataIndex: 'baseline' },
                          { title: '当前', dataIndex: 'current' },
                        ]}
                      />
                    </>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="退化检测（近 7 日窗口）" size="small">
                  {reg && (
                    <>
                      <p>
                        状态：
                        {reg.regressed ? (
                          <Tag color="red">已触发退化告警</Tag>
                        ) : (
                          <Tag color="green">无退化</Tag>
                        )}
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          基线 P95={reg.baseline.p95Ms}ms / 错误率={reg.baseline.errorRatePct}% / 吞吐={reg.baseline.throughputRps}rps
                        </Text>
                      </p>
                      {reg.signals.length === 0 ? (
                        <Alert type="success" showIcon message="当前采样在历史基线阈值内，无 warning / critical 信号。" />
                      ) : (
                        <Table
                          rowKey="metric"
                          size="small"
                          pagination={false}
                          dataSource={reg.signals}
                          columns={[
                            { title: '指标', dataIndex: 'metric' },
                            { title: '当前', dataIndex: 'current' },
                            { title: '阈值', dataIndex: 'threshold' },
                            { title: '偏离%', dataIndex: 'deviationPct' },
                            {
                              title: '等级',
                              dataIndex: 'severity',
                              render: (s: RegressionSignalV2['severity']) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
                            },
                          ]}
                        />
                      )}
                    </>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
