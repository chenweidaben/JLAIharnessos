/**
 * 健澜科技 jlmedaios - M145-C 系统监控仪表盘（仅 admin，生产化收尾）
 *
 * 监控要有告警，不能只看图表：
 *  - 顶部告警区：超阈值（P95>1s / 错误率>1% / 内存>90%）即时红色置顶；
 *  - 指标卡：七类指标最新值，越阈自动标红；
 *  - 趋势区：逐指标按整点小时分桶展示均值 / 峰值 / 样本数。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无采样数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF buildDashboardView 输出对齐 */
interface LatestMetricRow {
  type: string;
  label: string;
  unit: string;
  value: number | null;
  tags: Record<string, string>;
  recordedAt: number | null;
}

interface TrendPoint {
  bucketStart: number;
  avg: number;
  max: number;
  count: number;
}

interface Trend {
  metricType: string;
  hours: number;
  points: TrendPoint[];
  latest: number | null;
}

interface MetricAlert {
  type: string;
  value: number;
  threshold: number;
  level: 'warning' | 'critical';
  message: string;
  triggeredAt: number;
}

interface AlertRule {
  type: string;
  threshold: number;
  unit: string;
  message: string;
}

interface MetricsDashboard {
  windowHours: number;
  latest: LatestMetricRow[];
  trends: Trend[];
  alerts: MetricAlert[];
  rules: AlertRule[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 错误率类指标在 BFF 以 0..1 存储，前端按百分比展示 */
const RATIO_TYPES = new Set(['error_rate']);

/** 数值按指标类型格式化 */
function formatValue(type: string, v: number | null): string {
  if (v === null || v === undefined) return '—';
  if (RATIO_TYPES.has(type)) return `${(v * 100).toFixed(2)}%`;
  if (type.endsWith('_p50') || type.endsWith('_p95') || type.endsWith('_p99')) return `${Math.round(v)} ms`;
  if (type === 'memory_usage' || type === 'cpu_usage') return `${v.toFixed(1)}%`;
  return `${v}`;
}

/** 按规则判定指标卡是否越阈（越阈标红） */
function overThreshold(rules: AlertRule[], type: string, v: number | null): boolean {
  if (v === null) return false;
  const rule = rules.find((r) => r.type === type);
  return !!rule && v > rule.threshold;
}

function bucketLabel(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hh}:00`;
}

export default function SystemMetricsDashboard() {
  const [data, setData] = useState<MetricsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/metrics');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as MetricsDashboard);
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

  const hasAlerts = !!data && data.alerts.length > 0;

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
          系统监控仪表盘
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          七类系统指标 · 超阈值自动告警（P95&gt;1s / 错误率&gt;1% / 内存&gt;90%）· 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载系统监控数据中…" />
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
        {!loading && !error && (!data || data.latest.every((r) => r.value === null)) && (
          <Alert
            type="info"
            showIcon
            message="暂无系统指标采样。BFF 启动采样器后（30s/次）将自动累积，稍后刷新即可。"
          />
        )}

        {!loading && !error && data && (
          <>
            {/* 告警区：监控要有告警，不能只看图表 */}
            {hasAlerts ? (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message={`检测到 ${data.alerts.length} 项超阈值告警，请立即处置`}
                description={
                  <List
                    size="small"
                    dataSource={data.alerts}
                    renderItem={(a) => (
                      <List.Item>
                        <Space>
                          <Tag color={a.level === 'critical' ? 'red' : 'orange'}>
                            {a.level === 'critical' ? '严重' : '警告'}
                          </Tag>
                          <Text strong>{a.message}</Text>
                          <Text type="secondary">
                            实测 {formatValue(a.type, a.value)} / 阈值{' '}
                            {formatValue(a.type, a.threshold)}
                          </Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                }
              />
            ) : (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                message="全部指标正常，未触发超阈值告警"
                description="告警规则：P95>1s、错误率>1%、内存>90%"
              />
            )}

            {/* 指标卡：七类指标最新值 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {data.latest.map((row) => {
                const bad = overThreshold(data.rules, row.type, row.value);
                return (
                  <Col xs={12} md={6} key={row.type}>
                    <Card>
                      <Statistic
                        title={
                          <Space>
                            {row.label}
                            {bad && <Tag color="red">越阈</Tag>}
                          </Space>
                        }
                        value={formatValue(row.type, row.value)}
                        valueStyle={bad ? { color: '#cf1322' } : undefined}
                      />
                      {row.recordedAt && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          采样于 {new Date(row.recordedAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 趋势区：逐指标按整点小时分桶 */}
            <Card
              title={`指标趋势（最近 ${data.windowHours} 小时 · 按整点分桶）`}
              extra={
                <Button size="small" onClick={load}>
                  刷新
                </Button>
              }
            >
              <Row gutter={[16, 16]}>
                {data.trends.map((trend) => {
                  const label = data.latest.find((r) => r.type === trend.metricType)?.label ?? trend.metricType;
                  return (
                    <Col xs={24} md={12} key={trend.metricType}>
                      <Card type="inner" size="small" title={label}>
                        <Table
                          rowKey="bucketStart"
                          size="small"
                          pagination={false}
                          dataSource={trend.points}
                          locale={{ emptyText: '该窗口暂无采样' }}
                          columns={[
                            {
                              title: '时段',
                              dataIndex: 'bucketStart',
                              width: 140,
                              render: (v: number) => bucketLabel(v),
                            },
                            {
                              title: '均值',
                              dataIndex: 'avg',
                              render: (v: number) => formatValue(trend.metricType, v),
                            },
                            {
                              title: '峰值',
                              dataIndex: 'max',
                              render: (v: number) => formatValue(trend.metricType, v),
                            },
                            { title: '样本', dataIndex: 'count', width: 60 },
                          ]}
                        />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
