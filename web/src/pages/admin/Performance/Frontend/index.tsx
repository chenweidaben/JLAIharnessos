/**
 * 健澜科技 jlmedaios - M145-B 前端性能报告页（仅 admin）
 *
 * 【前端性能优化】展示：打包体积分析（入口/vendor/超预算 chunk/健康分）
 * + 路由懒加载覆盖率（待改懒加载路由、首屏缺骨架屏路由、改进建议）。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF BundleAnalysis 输出对齐 */
interface OverBudgetChunk {
  name: string;
  rawBytes: number;
  gzipBytes: number;
  budgetBytes: number;
  kind: 'entry' | 'lazy';
}

interface BundleAnalysis {
  chunkCount: number;
  totalRawBytes: number;
  totalGzipBytes: number;
  entryRawBytes: number;
  entryGzipBytes: number;
  vendorRawBytes: number;
  overBudget: OverBudgetChunk[];
  entryWithinBudget: boolean;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  recommendations: string[];
}

interface LazyLoadingReport {
  totalRoutes: number;
  lazyCount: number;
  eagerCount: number;
  lazyRatio: number;
  criticalCount: number;
  skeletonReady: number;
  eagerRoutes: string[];
  missingSkeleton: string[];
  score: number;
  recommendations: string[];
}

interface FrontendPerformanceView {
  bundle: BundleAnalysis;
  lazy: LazyLoadingReport;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 字节 → KB 字符串 */
function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** 等级 → 颜色 */
function gradeColor(grade: string): string {
  return grade === 'A' ? '#3f8600' : grade === 'B' ? '#1e6fbf' : grade === 'C' ? '#d48806' : '#cf1322';
}

export default function FrontendPerformancePage() {
  const [data, setData] = useState<FrontendPerformanceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/frontend');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as FrontendPerformanceView);
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

  const bundle = data?.bundle;
  const lazy = data?.lazy;
  const lazyPct = lazy ? Math.round(lazy.lazyRatio * 100) : 0;

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
          前端性能报告
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【前端性能优化】打包体积分析 · 路由懒加载覆盖率 · 首屏骨架屏 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载前端性能报告中…" />
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
          <Alert type="info" showIcon message="暂无前端性能数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="体积健康分"
                    value={bundle?.score ?? 0}
                    suffix={`/100`}
                    valueStyle={{ color: gradeColor(bundle?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="体积等级"
                    value={bundle?.grade ?? '-'}
                    valueStyle={{ color: gradeColor(bundle?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="chunk 数" value={bundle?.chunkCount ?? 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="入口 gzip"
                    value={bundle ? bundle.entryGzipBytes / 1024 : 0}
                    precision={1}
                    suffix="KB"
                    valueStyle={{ color: bundle?.entryWithinBudget ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 懒加载覆盖率 */}
            <Card title="路由懒加载覆盖率" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={10}>
                  <Progress percent={lazyPct} size="large" strokeColor={VI.accent} />
                </Col>
                <Col span={14}>
                  <Text type="secondary">
                    共 {lazy?.totalRoutes ?? 0} 条路由，已懒加载 {lazy?.lazyCount ?? 0} 条，
                    待改 {lazy?.eagerCount ?? 0} 条；首屏关键 {lazy?.criticalCount ?? 0} 条，
                    已配骨架屏 {lazy?.skeletonReady ?? 0} 条。
                  </Text>
                </Col>
              </Row>
              {lazy && lazy.eagerRoutes.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text strong>建议改懒加载：</Text>{' '}
                  {lazy.eagerRoutes.map((p) => (
                    <Tag key={p} color="orange" style={{ marginBottom: 4 }}>
                      {p}
                    </Tag>
                  ))}
                </div>
              )}
              {lazy && lazy.missingSkeleton.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>首屏缺骨架屏：</Text>{' '}
                  {lazy.missingSkeleton.map((p) => (
                    <Tag key={p} color="red" style={{ marginBottom: 4 }}>
                      {p}
                    </Tag>
                  ))}
                </div>
              )}
            </Card>

            {/* 超预算 chunk */}
            <Card title="超预算 chunk（gzip 口径）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="name"
                pagination={false}
                dataSource={bundle?.overBudget ?? []}
                locale={{ emptyText: '无超预算 chunk，体积达标' }}
                columns={[
                  {
                    title: 'chunk',
                    dataIndex: 'name',
                    render: (v: string, row) => (
                      <Tag color={row.kind === 'entry' ? 'red' : 'orange'}>{v}</Tag>
                    ),
                  },
                  { title: '类型', dataIndex: 'kind', width: 90 },
                  {
                    title: 'gzip',
                    dataIndex: 'gzipBytes',
                    width: 120,
                    render: (v: number) => kb(v),
                  },
                  {
                    title: '预算',
                    dataIndex: 'budgetBytes',
                    width: 120,
                    render: (v: number) => kb(v),
                  },
                ]}
              />
            </Card>

            {/* 改进建议 */}
            <Card title="改进建议">
              <List
                size="small"
                dataSource={[...(bundle?.recommendations ?? []), ...(lazy?.recommendations ?? [])]}
                renderItem={(item) => <List.Item>· {item}</List.Item>}
                locale={{ emptyText: '暂无建议' }}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
