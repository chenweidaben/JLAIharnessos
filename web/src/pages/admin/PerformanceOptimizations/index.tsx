/**
 * 健澜科技 jlmedaios - M128-D 系统性能优化面板（仅 admin）
 *
 * 【移动端+性能优化】展示：BFF 进程内 TTL 缓存命中率 + 推荐索引清单
 * （与 249-performance-indexes.sql 一一对应）。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF PerformanceOptimizationsView 输出对齐 */
interface IndexRecommendationRow {
  table: string;
  columns: string[];
  purpose: string;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  maxKeys: number;
}

interface OptimizationsView {
  indexRecommendations: IndexRecommendationRow[];
  cache: CacheStats;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

export default function PerformanceOptimizationsPage() {
  const [data, setData] = useState<OptimizationsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/optimizations');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as OptimizationsView);
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

  const cache = data?.cache;
  const hitPct = cache ? (cache.hitRate * 100).toFixed(1) : '0.0';

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
          性能优化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【移动端+性能优化】BFF TTL 缓存观测 · 推荐索引清单 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载性能优化数据中…" />
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
          <Alert type="info" showIcon message="暂无性能优化数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 缓存指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="缓存键数" value={cache?.size ?? 0} suffix={`/ ${cache?.maxKeys ?? 0}`} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="命中次数" value={cache?.hits ?? 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="未命中次数" value={cache?.misses ?? 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="命中率"
                    value={hitPct}
                    suffix="%"
                    valueStyle={{ color: (cache?.hitRate ?? 0) >= 0.5 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 推荐索引 */}
            <Card title="推荐索引（与 249-performance-indexes.sql 对齐）">
              <Table
                rowKey="table"
                pagination={false}
                dataSource={data.indexRecommendations}
                locale={{ emptyText: '暂无索引建议' }}
                columns={[
                  {
                    title: '表',
                    dataIndex: 'table',
                    render: (v: string) => <Tag color="blue">{v}</Tag>,
                  },
                  {
                    title: '复合索引列',
                    dataIndex: 'columns',
                    width: 220,
                    render: (cols: string[]) => cols.join(' → '),
                  },
                  { title: '面向读路径', dataIndex: 'purpose', ellipsis: true },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
