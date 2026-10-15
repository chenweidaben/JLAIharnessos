/**
 * 健澜科技 jlmedaios - M123-C 系统错误监控面板（生产安全加固）
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 医疗信息系统的稳定运行是患者安全的底线。把运行时错误聚合成今日数、
 * 7 日趋势、高频类型与未闭环工单，驱动运维快速定位与闭环。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无错误记录）。
 * 深海蓝 VI：主色 #0A4D8C（渐变至 #1565B8）。
 * 仅 admin 角色可访问（后端已二次鉴权，非 admin 返回 403）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Layout,
  List,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 主色 */
const DEEP_SEA = '#0A4D8C';
const DEEP_SEA_LIGHT = '#1565B8';

/** 与 BFF GET /api/v1/admin/errors 输出对齐 */
interface SystemErrorView {
  id: number;
  errorType: string;
  message: string;
  stackTrace: string;
  route: string;
  staffId: string;
  createdAt: string;
  resolved: boolean;
}

interface ErrorAggregationView {
  todayCount: number;
  trend: Array<{ date: string; count: number }>;
  topTypes: Array<{ errorType: string; count: number }>;
  unresolved: number;
}

interface ErrorsResponse {
  errors: SystemErrorView[];
  aggregation: ErrorAggregationView;
}

export default function AdminErrorsPage() {
  const [data, setData] = useState<ErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/errors');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ErrorsResponse);
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

  // 趋势最大值（用于纯 CSS 条形归一化，零新依赖）
  const trendMax = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, ...data.aggregation.trend.map((t) => t.count));
  }, [data]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* 深海蓝 VI 页头 */}
        <div
          style={{
            background: `linear-gradient(to right, ${DEEP_SEA}, ${DEEP_SEA_LIGHT})`,
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 20,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(10,77,140,0.25)',
          }}
        >
          <Title level={3} style={{ color: '#fff', marginBottom: 4 }}>
            系统错误监控
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 0 }}>
            运行时异常统一观测面板 · 今日新增 / 7 日趋势 / 高频类型 / 未闭环工单
          </Paragraph>
        </div>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载错误监控中…" />
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
        {!loading && !error && (!data || data.errors.length === 0) && (
          <Alert
            type="success"
            showIcon
            message="暂无系统错误记录，系统运行正常。"
            description="当出现未捕获异常或依赖故障时，将自动记录到此面板。"
          />
        )}

        {!loading && !error && data && data.errors.length > 0 && (
          <>
            {/* 概览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Text type="secondary">今日新增错误</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: DEEP_SEA }}>
                    {data.aggregation.todayCount}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Text type="secondary">未闭环工单</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: data.aggregation.unresolved > 0 ? '#cf1322' : '#3f8600' }}>
                    {data.aggregation.unresolved}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Text type="secondary">近期记录总数</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: DEEP_SEA }}>
                    {data.errors.length}
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 7 日趋势（纯 CSS 条形，零依赖） */}
              <Col span={14}>
                <Card title="近 7 日错误趋势">
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                    {data.aggregation.trend.map((t) => (
                      <div key={t.date} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ marginBottom: 4, fontSize: 12 }}>{t.count}</div>
                        <div
                          style={{
                            height: `${(t.count / trendMax) * 120}px`,
                            minHeight: t.count > 0 ? 4 : 1,
                            background: t.count > 0 ? DEEP_SEA_LIGHT : '#e6e6e6',
                            borderRadius: '4px 4px 0 0',
                          }}
                        />
                        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                          {t.date.slice(5)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>

              {/* 高频错误类型 */}
              <Col span={10}>
                <Card title="高频错误类型 Top5">
                  <List
                    size="small"
                    dataSource={data.aggregation.topTypes}
                    locale={{ emptyText: '暂无错误类型' }}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          <Tag color="red">{item.errorType}</Tag>
                          <Text type="secondary">{item.count} 次</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {/* 错误明细 */}
            <Card title="错误明细">
              <Table
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                dataSource={data.errors}
                expandable={{
                  expandedRowRender: (r) => (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: 12,
                        color: '#666',
                      }}
                    >
                      {r.stackTrace || '（无堆栈）'}
                    </pre>
                  ),
                }}
                columns={[
                  {
                    title: '状态',
                    dataIndex: 'resolved',
                    width: 90,
                    render: (v: boolean) =>
                      v ? <Badge status="success" text="已闭环" /> : <Badge status="error" text="未闭环" />,
                  },
                  { title: '类型', dataIndex: 'errorType', width: 130, render: (v: string) => <Tag color="volcano">{v}</Tag> },
                  { title: '错误摘要', dataIndex: 'message', ellipsis: true },
                  { title: '路由', dataIndex: 'route', width: 200, ellipsis: true, render: (v: string) => <Text code>{v || '-'}</Text> },
                  { title: '员工', dataIndex: 'staffId', width: 110, render: (v: string) => v || '-' },
                  {
                    title: '时间',
                    dataIndex: 'createdAt',
                    width: 170,
                    render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
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
