/**
 * 健澜科技 jlmedaios - M158-C 首屏与缓存性能监控页（仅 admin · v4.x近期）
 *
 * 展示 BFF 纯函数聚合的首屏优化闭环：
 *  - optimizeFirstLoad：七项措施（路由懒加载 / 组件按需 / API 预取 /
 *    关键 CSS 内联 / 静态长缓存 hash / API 内存 60s / localStorage 偏好）；
 *  - buildCacheStrategy：三类缓存策略的 TTL、命中率；
 *  - measureFirstLoadTime：优化前后 FCP/LCP/TTI/体积/请求数，
 *    校验「首屏 < 2s / LCP < 1.5s」目标。
 * 三态：loading / error（可重试）/ empty。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF firstLoadAggregator 输出对齐 */
type OptimizeMeasureId =
  | 'ROUTE_LAZY_LOAD'
  | 'COMPONENT_ON_DEMAND'
  | 'API_PREFETCH'
  | 'CRITICAL_CSS_INLINE'
  | 'STATIC_LONG_CACHE_HASH'
  | 'API_MEMORY_CACHE_60S'
  | 'USER_PREF_LOCALSTORAGE';

interface FirstLoadMeasure {
  id: OptimizeMeasureId;
  name: string;
  description: string;
  status: 'applied' | 'planned';
  bundleReductionKB: number;
  timeSavedMs: number;
}

interface OptimizationResult {
  measures: FirstLoadMeasure[];
  summary: {
    total: number;
    applied: number;
    planned: number;
    totalBundleReductionKB: number;
    totalTimeSavedMs: number;
  };
}

type CacheKind = 'STATIC_ASSET' | 'API_MEMORY' | 'USER_PREF';

interface CacheRule {
  kind: CacheKind;
  target: string;
  policy: string;
  ttlSeconds: number;
  expectedHitRatePct: number;
  note: string;
}

interface CacheStrategy {
  rules: CacheRule[];
  summary: {
    staticImmutable: boolean;
    apiMemoryTtlSeconds: number;
    localStorageEnabled: boolean;
    expectedHitRatePct: number;
  };
}

interface FirstLoadMetrics {
  fcpMs: number;
  lcpMs: number;
  ttiMs: number;
  bundleKB: number;
  requests: number;
}

interface MetricResult {
  before: FirstLoadMetrics;
  after: FirstLoadMetrics;
  delta: {
    fcpMs: number;
    lcpMs: number;
    ttiMs: number;
    bundleKB: number;
    requests: number;
  };
  target: {
    firstScreenTargetMs: number;
    lcpTargetMs: number;
    firstScreenMet: boolean;
    lcpMet: boolean;
  };
}

interface FirstLoadResponse {
  optimization: OptimizationResult;
  cache: CacheStrategy;
  metrics: MetricResult;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function kindTag(k: CacheKind) {
  if (k === 'STATIC_ASSET') return <Tag color="blue">静态资源</Tag>;
  if (k === 'API_MEMORY') return <Tag color="geekblue">API 内存</Tag>;
  return <Tag color="purple">用户偏好</Tag>;
}

export default function FirstLoadPage() {
  const [data, setData] = useState<FirstLoadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/firstload');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as FirstLoadResponse);
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
  const cache = data?.cache;
  const metrics = data?.metrics;

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
          首屏与缓存性能监控
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          路由懒加载 · 组件按需 · API 预取 · 关键 CSS 内联 · 静态长缓存 hash · API 内存 60s ·
          localStorage 偏好 · 目标首屏 &lt; 2s / LCP &lt; 1.5s · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载首屏性能数据中…" />
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
          <Alert type="info" showIcon message="暂无首屏性能数据。" />
        )}

        {!loading && !error && data && opt && cache && metrics && (
          <>
            {/* 概览指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="首屏 FCP（优化后）"
                    value={metrics.after.fcpMs}
                    suffix="ms"
                    valueStyle={{
                      color: metrics.target.firstScreenMet ? '#3f8600' : '#cf1322',
                    }}
                  />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    目标 &lt; {metrics.target.firstScreenTargetMs}ms ·{' '}
                    {metrics.target.firstScreenMet ? '已达成' : '未达成'}
                  </Paragraph>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="LCP（优化后）"
                    value={metrics.after.lcpMs}
                    suffix="ms"
                    valueStyle={{
                      color: metrics.target.lcpMet ? '#3f8600' : '#cf1322',
                    }}
                  />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    目标 &lt; {metrics.target.lcpTargetMs}ms ·{' '}
                    {metrics.target.lcpMet ? '已达成' : '未达成'}
                  </Paragraph>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="首屏体积（优化后）"
                    value={metrics.after.bundleKB}
                    suffix="KB"
                    valueStyle={{ color: VI.accent }}
                  />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    优化前 {metrics.before.bundleKB} KB（-{metrics.delta.bundleKB} KB）
                  </Paragraph>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="已落地措施"
                    value={`${opt.summary.applied}/${opt.summary.total}`}
                    valueStyle={{ fontSize: 20, color: VI.accent }}
                  />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    累计省 {opt.summary.totalTimeSavedMs} ms / 减{' '}
                    {opt.summary.totalBundleReductionKB} KB
                  </Paragraph>
                </Card>
              </Col>
            </Row>

            {/* FCP / LCP 目标达成进度 */}
            <Card title="首屏核心指标对比（优化前 → 优化后）" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <Statistic title="FCP 首次内容绘制" value={metrics.before.fcpMs} suffix="ms" />
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    → {metrics.after.fcpMs} ms（{metrics.delta.fcpMs}）
                  </Paragraph>
                  <Progress
                    percent={Math.min(
                      100,
                      Math.round((metrics.after.fcpMs / metrics.target.firstScreenTargetMs) * 100),
                    )}
                    size="small"
                    status={metrics.target.firstScreenMet ? 'success' : 'exception'}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="LCP 最大内容绘制"
                    value={metrics.before.lcpMs}
                    suffix="ms"
                    valueStyle={{ color: '#cf1322' }}
                  />
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    → {metrics.after.lcpMs} ms（{metrics.delta.lcpMs}）
                  </Paragraph>
                  <Progress
                    percent={Math.min(
                      100,
                      Math.round((metrics.after.lcpMs / metrics.target.lcpTargetMs) * 100),
                    )}
                    size="small"
                    status={metrics.target.lcpMet ? 'success' : 'exception'}
                  />
                </Col>
                <Col span={8}>
                  <Statistic title="TTI 可交互" value={metrics.before.ttiMs} suffix="ms" />
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    → {metrics.after.ttiMs} ms（{metrics.delta.ttiMs}）· 请求{' '}
                    {metrics.before.requests} → {metrics.after.requests}（{metrics.delta.requests}）
                  </Paragraph>
                </Col>
              </Row>
            </Card>

            {/* 七项优化措施 */}
            <Card title="首屏优化措施（按节省时间降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={opt.measures}
                locale={{ emptyText: '暂无优化措施' }}
                columns={[
                  { title: '措施', dataIndex: 'name', width: 160 },
                  {
                    title: '说明',
                    dataIndex: 'description',
                    render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 90,
                    render: (v: 'applied' | 'planned') =>
                      v === 'applied' ? <Tag color="green">已落地</Tag> : <Tag color="orange">规划中</Tag>,
                  },
                  {
                    title: '减体积',
                    dataIndex: 'bundleReductionKB',
                    width: 90,
                    render: (v: number) => (v > 0 ? <Tag color="blue">-{v} KB</Tag> : <Text type="secondary">—</Text>),
                  },
                  {
                    title: '省时间',
                    dataIndex: 'timeSavedMs',
                    width: 90,
                    render: (v: number) => <Tag color="green">-{v} ms</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 缓存策略 */}
            <Card title="缓存策略（静态 immutable / API 内存 60s / localStorage）">
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic
                    title="静态 immutable"
                    value={cache.summary.staticImmutable ? '开启' : '关闭'}
                    valueStyle={{ color: cache.summary.staticImmutable ? '#3f8600' : '#cf1322', fontSize: 18 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="API 内存缓存 TTL"
                    value={cache.summary.apiMemoryTtlSeconds}
                    suffix="s"
                    valueStyle={{ color: VI.accent }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="综合命中率"
                    value={cache.summary.expectedHitRatePct}
                    suffix="%"
                    valueStyle={{ color: VI.accent }}
                  />
                </Col>
              </Row>
              <Table
                rowKey="kind"
                pagination={false}
                dataSource={cache.rules}
                locale={{ emptyText: '暂无缓存规则' }}
                columns={[
                  {
                    title: '类别',
                    dataIndex: 'kind',
                    width: 110,
                    render: (v: CacheKind) => kindTag(v),
                  },
                  {
                    title: '目标',
                    dataIndex: 'target',
                    render: (v: string) => (
                      <Text code style={{ fontSize: 12 }}>
                        {v}
                      </Text>
                    ),
                  },
                  {
                    title: '策略',
                    dataIndex: 'policy',
                    render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
                  },
                  {
                    title: 'TTL',
                    dataIndex: 'ttlSeconds',
                    width: 110,
                    render: (v: number) =>
                      v < 0 ? <Tag color="purple">持久</Tag> : <Tag color="blue">{v}s</Tag>,
                  },
                  {
                    title: '命中率',
                    dataIndex: 'expectedHitRatePct',
                    width: 90,
                    render: (v: number) => `${v}%`,
                  },
                ]}
              />
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                设计原则：本页为「优化措施 + 缓存策略 + 实测对比」报告，不直接改运行时配置；
                API 内存缓存仅作用于只读聚合接口，60s TTL 内不回源 DB。
              </Paragraph>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
