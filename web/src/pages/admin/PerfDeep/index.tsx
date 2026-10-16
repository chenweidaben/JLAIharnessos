/**
 * 健澜科技 jlmedaios - M165-D 系统性能与稳定性持续优化深度审计面板（仅 admin）
 *
 * 【CDSS与运营精细化】展示 GET /api/v1/admin/performance/deep-audit 返回的四组数据：
 *  - 五维深度性能审计：慢查询 TOP10（>500ms）/ 大表顺序扫描 / N+1 查询 /
 *    内存泄漏信号 / 前端渲染性能（长列表 / 复杂组件 / 过度重渲染 / 大 bundle）；
 *  - 数据库索引建议（btree / 覆盖索引 / 部分索引 / GIN，含扫描行数与耗时收益）；
 *  - 下游依赖熔断器状态（CLOSED / OPEN / HALF_OPEN，失败率与 24h 熔断次数）；
 *  - 健康检查面板（BFF / 数据库 / 缓存 / LLM 网关 / 集成通道，UP / DEGRADED / DOWN）。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF PerfDeepView 输出对齐的类型 ---------------- */

type SlowQueryKind = 'N_PLUS_ONE' | 'FULL_SCAN' | 'MISSING_INDEX' | 'AGG_UNINDEXED';
type FrontendRenderKind = 'LONG_LIST' | 'HEAVY_COMPONENT' | 'EXCESSIVE_RE_RENDER' | 'LARGE_BUNDLE';
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN';

interface SlowQueryTopRow {
  rank: number;
  id: string;
  table: string;
  pattern: string;
  kind: SlowQueryKind;
  avgMs: number;
  p95Ms: number;
  callsPerDay: number;
}

interface BigTableScanRow {
  table: string;
  rowCount: number;
  sizeGb: number;
  seqScansPerDay: number;
  staleStatsDays: number;
  recommendation: string;
}

interface NPlusOneRow {
  id: string;
  endpoint: string;
  rootQuery: string;
  childQuery: string;
  executionsPerPage: number;
  callsPerDay: number;
  estimatedReducedCallsPerDay: number;
}

interface MemoryLeakSignal {
  id: string;
  location: string;
  growthMbPerHour: number;
  heapGrowthMb: number;
  sampleCount: number;
  severity: 'low' | 'medium' | 'high';
}

interface FrontendRenderRow {
  id: string;
  component: string;
  kind: FrontendRenderKind;
  avgFps: number;
  renderMs: number;
  scale: string;
  recommendation: string;
}

interface DeepAudit {
  slowQueryTop10: SlowQueryTopRow[];
  bigTableScans: BigTableScanRow[];
  nPlusOneIssues: NPlusOneRow[];
  memoryLeaks: MemoryLeakSignal[];
  frontendRender: FrontendRenderRow[];
  summary: {
    slowQueryOver500: number;
    bigTableCount: number;
    nPlusOneCount: number;
    memoryLeakCount: number;
    frontendIssueCount: number;
    criticalCount: number;
    healthScore: number;
  };
}

interface IndexRecommendation {
  id: string;
  table: string;
  columns: string[];
  indexType: 'btree' | 'covering' | 'partial' | 'gin';
  indexName: string;
  scannedRowsBeforePerDay: number;
  scannedRowsAfterPerDay: number;
  expectedMsSaving: number;
  writeAmplification: 'low' | 'medium' | 'high';
  rationale: string;
}

interface IndexOptimization {
  recommendations: IndexRecommendation[];
  summary: {
    total: number;
    totalRowsReducedPerDay: number;
    avgMsSavingPct: number;
  };
}

interface CircuitBreakerRow {
  name: string;
  kind: string;
  state: CircuitState;
  failureRatePct: number;
  totalRequests: number;
  failures: number;
  openCount24h: number;
  thresholdPct: number;
  resetAfterSec: number;
}

interface CircuitBreakerMetrics {
  circuits: CircuitBreakerRow[];
  summary: {
    total: number;
    open: number;
    halfOpen: number;
    closed: number;
    degraded: number;
    totalOpenCount24h: number;
    avgFailureRatePct: number;
  };
}

interface HealthCheckRow {
  name: string;
  category: string;
  status: HealthStatus;
  latencyMs: number;
  uptime24hPct: number;
  incidentCount24h: number;
  message: string;
}

interface HealthDashboard {
  checks: HealthCheckRow[];
  summary: {
    up: number;
    degraded: number;
    down: number;
    total: number;
    overall: HealthStatus;
    avgLatencyMs: number;
  };
}

interface PerfDeepView {
  audit: DeepAudit;
  indexOptimization: IndexOptimization;
  circuitBreakers: CircuitBreakerMetrics;
  health: HealthDashboard;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SLOW_KIND_COLOR: Record<SlowQueryKind, string> = {
  N_PLUS_ONE: 'orange',
  FULL_SCAN: 'red',
  MISSING_INDEX: 'gold',
  AGG_UNINDEXED: 'purple',
};

const FRONTEND_KIND_COLOR: Record<FrontendRenderKind, string> = {
  LONG_LIST: 'geekblue',
  HEAVY_COMPONENT: 'volcano',
  EXCESSIVE_RE_RENDER: 'magenta',
  LARGE_BUNDLE: 'cyan',
};

const CIRCUIT_COLOR: Record<CircuitState, string> = {
  CLOSED: 'green',
  HALF_OPEN: 'orange',
  OPEN: 'red',
};

const HEALTH_COLOR: Record<HealthStatus, string> = {
  UP: 'green',
  DEGRADED: 'orange',
  DOWN: 'red',
};

const SEVERITY_COLOR: Record<MemoryLeakSignal['severity'], string> = {
  low: 'blue',
  medium: 'orange',
  high: 'red',
};

/** 千分位格式化 */
const fmtInt = (v: number): string => v.toLocaleString('zh-CN');

export default function PerfDeepPage() {
  const [data, setData] = useState<PerfDeepView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/deep-audit');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PerfDeepView);
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

  const audit = data?.audit;
  const cb = data?.circuitBreakers;
  const health = data?.health;
  const idx = data?.indexOptimization;

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
          性能深度审计
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【CDSS与运营精细化】慢查询 TOP10 · 大表扫描 · N+1 · 内存泄漏 · 前端渲染 ·
          熔断器 · 健康检查 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载性能深度审计数据中…" />
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
          <Alert type="info" showIcon message="暂无性能深度审计数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 汇总指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="健康分"
                    value={audit?.summary.healthScore ?? 0}
                    suffix="/ 100"
                    valueStyle={{
                      color: (audit?.summary.healthScore ?? 0) >= 80 ? '#3f8600' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="慢查询 >500ms"
                    value={audit?.summary.slowQueryOver500 ?? 0}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="严重问题" value={audit?.summary.criticalCount ?? 0} />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="熔断降级依赖"
                    value={cb?.summary.degraded ?? 0}
                    suffix={`/ ${cb?.summary.total ?? 0}`}
                    valueStyle={{ color: (cb?.summary.degraded ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="健康检查"
                    value={health?.summary.overall ?? '-'}
                    valueStyle={{
                      color:
                        health?.summary.overall === 'UP'
                          ? '#3f8600'
                          : health?.summary.overall === 'DEGRADED'
                            ? '#d48806'
                            : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="索引建议日均减扫"
                    value={fmtInt(idx?.summary.totalRowsReducedPerDay ?? 0)}
                    suffix="行"
                  />
                </Card>
              </Col>
            </Row>

            {/* 慢查询 TOP10 */}
            <Card title="慢查询 TOP10（avgMs > 500ms，按耗时降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={audit?.slowQueryTop10 ?? []}
                size="small"
                locale={{ emptyText: '暂无慢查询' }}
                columns={[
                  { title: '#', dataIndex: 'rank', width: 50 },
                  {
                    title: '表',
                    dataIndex: 'table',
                    width: 200,
                    render: (v: string) => <Tag color="blue">{v}</Tag>,
                  },
                  { title: '查询模式', dataIndex: 'pattern', ellipsis: true },
                  {
                    title: '类别',
                    dataIndex: 'kind',
                    width: 130,
                    render: (v: SlowQueryKind) => <Tag color={SLOW_KIND_COLOR[v]}>{v}</Tag>,
                  },
                  {
                    title: 'avg(ms)',
                    dataIndex: 'avgMs',
                    width: 90,
                    render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 600 }}>{v}</span>,
                  },
                  { title: 'P95(ms)', dataIndex: 'p95Ms', width: 90 },
                  { title: '次/日', dataIndex: 'callsPerDay', width: 90, render: fmtInt },
                ]}
              />
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 大表扫描 */}
              <Col span={12}>
                <Card title="大表顺序扫描" size="small">
                  <Table
                    rowKey="table"
                    pagination={false}
                    dataSource={audit?.bigTableScans ?? []}
                    size="small"
                    locale={{ emptyText: '暂无大表扫描问题' }}
                    columns={[
                      { title: '表', dataIndex: 'table', width: 180 },
                      { title: '行数', dataIndex: 'rowCount', width: 100, render: fmtInt },
                      { title: 'GB', dataIndex: 'sizeGb', width: 70 },
                      { title: 'seq/日', dataIndex: 'seqScansPerDay', width: 80, render: fmtInt },
                      { title: '统计信息过期(天)', dataIndex: 'staleStatsDays', width: 110 },
                      { title: '建议', dataIndex: 'recommendation', ellipsis: true },
                    ]}
                  />
                </Card>
              </Col>

              {/* N+1 */}
              <Col span={12}>
                <Card title="N+1 查询" size="small">
                  <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={audit?.nPlusOneIssues ?? []}
                    size="small"
                    locale={{ emptyText: '暂无 N+1 问题' }}
                    columns={[
                      { title: '入口', dataIndex: 'endpoint', ellipsis: true },
                      { title: '根查询', dataIndex: 'rootQuery', ellipsis: true },
                      { title: '子查询', dataIndex: 'childQuery', ellipsis: true },
                      { title: '次/页', dataIndex: 'executionsPerPage', width: 80 },
                      {
                        title: '可减次/日',
                        dataIndex: 'estimatedReducedCallsPerDay',
                        width: 110,
                        render: fmtInt,
                      },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 内存泄漏 */}
              <Col span={12}>
                <Card title="内存泄漏信号" size="small">
                  <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={audit?.memoryLeaks ?? []}
                    size="small"
                    locale={{ emptyText: '暂无内存泄漏信号' }}
                    columns={[
                      { title: '位置', dataIndex: 'location', width: 200 },
                      { title: 'MB/时', dataIndex: 'growthMbPerHour', width: 80 },
                      { title: '累计 MB', dataIndex: 'heapGrowthMb', width: 80 },
                      { title: '采样点', dataIndex: 'sampleCount', width: 70 },
                      {
                        title: '严重度',
                        dataIndex: 'severity',
                        width: 90,
                        render: (v: MemoryLeakSignal['severity']) => (
                          <Tag color={SEVERITY_COLOR[v]}>{v}</Tag>
                        ),
                      },
                    ]}
                  />
                </Card>
              </Col>

              {/* 前端渲染性能 */}
              <Col span={12}>
                <Card title="前端渲染性能（长列表 / 复杂组件）" size="small">
                  <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={audit?.frontendRender ?? []}
                    size="small"
                    locale={{ emptyText: '暂无前端渲染问题' }}
                    columns={[
                      { title: '组件', dataIndex: 'component', width: 200, ellipsis: true },
                      {
                        title: '类别',
                        dataIndex: 'kind',
                        width: 150,
                        render: (v: FrontendRenderKind) => <Tag color={FRONTEND_KIND_COLOR[v]}>{v}</Tag>,
                      },
                      { title: 'fps', dataIndex: 'avgFps', width: 60 },
                      { title: '渲染 ms', dataIndex: 'renderMs', width: 80 },
                      { title: '建议', dataIndex: 'recommendation', ellipsis: true },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            {/* 索引建议 */}
            <Card
              title={`索引建议（${idx?.summary.total ?? 0} 项，加权预估耗时下降 ${idx?.summary.avgMsSavingPct ?? 0}%）`}
              style={{ marginBottom: 16 }}
            >
              <Table
                rowKey="id"
                pagination={false}
                dataSource={idx?.recommendations ?? []}
                size="small"
                locale={{ emptyText: '暂无索引建议' }}
                columns={[
                  { title: '表', dataIndex: 'table', width: 200 },
                  {
                    title: '索引列',
                    dataIndex: 'columns',
                    width: 200,
                    render: (cols: string[]) => cols.join(' → '),
                  },
                  { title: '类型', dataIndex: 'indexType', width: 90 },
                  { title: '索引名', dataIndex: 'indexName', width: 220, ellipsis: true },
                  {
                    title: '扫描行/日',
                    width: 160,
                    render: (_: unknown, row: IndexRecommendation) =>
                      `${fmtInt(row.scannedRowsBeforePerDay)} → ${fmtInt(row.scannedRowsAfterPerDay)}`,
                  },
                  { title: '省时 ms', dataIndex: 'expectedMsSaving', width: 90 },
                  {
                    title: '写放大',
                    dataIndex: 'writeAmplification',
                    width: 90,
                    render: (v: string) => (
                      <Tag color={v === 'low' ? 'green' : v === 'medium' ? 'orange' : 'red'}>{v}</Tag>
                    ),
                  },
                  { title: '依据', dataIndex: 'rationale', ellipsis: true },
                ]}
              />
            </Card>

            <Row gutter={16}>
              {/* 熔断器 */}
              <Col span={12}>
                <Card
                  title={`熔断器（OPEN ${cb?.summary.open ?? 0} / HALF_OPEN ${cb?.summary.halfOpen ?? 0} / CLOSED ${cb?.summary.closed ?? 0}，24h 熔断 ${cb?.summary.totalOpenCount24h ?? 0} 次）`}
                  size="small"
                >
                  <Table
                    rowKey="name"
                    pagination={false}
                    dataSource={cb?.circuits ?? []}
                    size="small"
                    locale={{ emptyText: '暂无熔断器指标' }}
                    columns={[
                      { title: '依赖', dataIndex: 'name', width: 180, ellipsis: true },
                      {
                        title: '状态',
                        dataIndex: 'state',
                        width: 100,
                        render: (v: CircuitState) => <Tag color={CIRCUIT_COLOR[v]}>{v}</Tag>,
                      },
                      {
                        title: '失败率',
                        dataIndex: 'failureRatePct',
                        width: 90,
                        render: (v: number) => `${v}%`,
                      },
                      { title: '请求数', dataIndex: 'totalRequests', width: 90, render: fmtInt },
                      { title: '熔断/24h', dataIndex: 'openCount24h', width: 90 },
                      { title: '阈值', dataIndex: 'thresholdPct', width: 70, render: (v: number) => `${v}%` },
                    ]}
                  />
                </Card>
              </Col>

              {/* 健康检查 */}
              <Col span={12}>
                <Card
                  title={`健康检查（UP ${health?.summary.up ?? 0} / DEGRADED ${health?.summary.degraded ?? 0} / DOWN ${health?.summary.down ?? 0}，平均探测 ${health?.summary.avgLatencyMs ?? 0}ms）`}
                  size="small"
                >
                  <Table
                    rowKey="name"
                    pagination={false}
                    dataSource={health?.checks ?? []}
                    size="small"
                    locale={{ emptyText: '暂无健康检查' }}
                    columns={[
                      { title: '组件', dataIndex: 'name', width: 180, ellipsis: true },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        width: 90,
                        render: (v: HealthStatus) => <Tag color={HEALTH_COLOR[v]}>{v}</Tag>,
                      },
                      { title: 'ms', dataIndex: 'latencyMs', width: 60 },
                      { title: '可用率', dataIndex: 'uptime24hPct', width: 80, render: (v: number) => `${v}%` },
                      { title: '事件/24h', dataIndex: 'incidentCount24h', width: 80 },
                      { title: '说明', dataIndex: 'message', ellipsis: true },
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
