/**
 * 健澜科技 jlmedaios - M123-D 系统性能监控面板（仅 admin）
 *
 * 展示 BFF 运行时采样：请求量、p50/p95/p99 耗时、慢接口 Top10、按天错误率趋势。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无采样数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF aggregatePerformance 输出对齐 */
interface SlowRouteRow {
  route: string;
  count: number;
  avgDurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
  errorCount: number;
}

interface ErrorRateRow {
  date: string;
  total: number;
  errors: number;
  errorRate: number;
}

interface PerformanceSummary {
  dailyRequests: number;
  p50: number;
  p95: number;
  p99: number;
  slowTop10: SlowRouteRow[];
  errorRateTrend: ErrorRateRow[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function durationTag(ms: number): 'green' | 'orange' | 'red' {
  if (ms < 200) return 'green';
  if (ms < 1000) return 'orange';
  return 'red';
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PerformanceSummary);
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
          系统性能监控
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          BFF 运行时采样 · 仅 admin 可见 · 进程内存态，重启后重新累积
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载性能监控数据中…" />
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
        {!loading && !error && (!data || data.dailyRequests === 0) && (
          <Alert
            type="info"
            showIcon
            message="暂无性能采样数据。BFF 正常接收请求后将自动累积，稍后刷新即可。"
          />
        )}

        {!loading && !error && data && data.dailyRequests > 0 && (
          <>
            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="采样请求数" value={data.dailyRequests} suffix="次" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="P50 耗时" value={data.p50} suffix="ms" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="P95 耗时" value={data.p95} suffix="ms" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="P99 耗时" value={data.p99} suffix="ms" />
                </Card>
              </Col>
            </Row>

            {/* 慢接口 Top10 */}
            <Card title="慢接口 Top10（按平均耗时降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="route"
                pagination={false}
                dataSource={data.slowTop10}
                locale={{ emptyText: '暂未采集到路由性能数据' }}
                columns={[
                  { title: '路由', dataIndex: 'route', ellipsis: true },
                  { title: '采样数', dataIndex: 'count', width: 90 },
                  {
                    title: '平均耗时',
                    dataIndex: 'avgDurationMs',
                    width: 120,
                    render: (v: number) => <Tag color={durationTag(v)}>{v} ms</Tag>,
                  },
                  {
                    title: 'P95',
                    dataIndex: 'p95DurationMs',
                    width: 110,
                    render: (v: number) => `${v} ms`,
                  },
                  {
                    title: '最大',
                    dataIndex: 'maxDurationMs',
                    width: 110,
                    render: (v: number) => `${v} ms`,
                  },
                  {
                    title: '错误数',
                    dataIndex: 'errorCount',
                    width: 90,
                    render: (v: number) =>
                      v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 按天错误率趋势 */}
            <Card title="按天错误率趋势">
              <Table
                rowKey="date"
                pagination={false}
                dataSource={data.errorRateTrend}
                locale={{ emptyText: '暂无按天错误率数据' }}
                columns={[
                  { title: '日期', dataIndex: 'date', width: 160 },
                  { title: '请求数', dataIndex: 'total', width: 120 },
                  { title: '错误数', dataIndex: 'errors', width: 120 },
                  {
                    title: '错误率',
                    dataIndex: 'errorRate',
                    render: (v: number) => {
                      const pct = (v * 100).toFixed(2);
                      return (
                        <Tag color={v > 0.05 ? 'red' : v > 0.01 ? 'orange' : 'green'}>
                          {pct}%
                        </Tag>
                      );
                    },
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
