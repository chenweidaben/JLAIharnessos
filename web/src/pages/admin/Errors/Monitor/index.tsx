/**
 * 健澜科技 jlmedaios - M149-D 错误监控页（生产质量门禁）
 *
 * 对接 BFF GET /api/v1/admin/errors/stats：把进程内错误日志按时间窗聚合，
 * 解决线上只有一句「500 错误」、排查无据的问题 —— 一屏看清：
 *  窗口总量 / 分级计数（error/warn/info）/ 高频错误码 Top10 / 高频路径 Top10 / 近期明细。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（窗口内无错误）。
 * 深海蓝 VI：主色 #0A4D8C（渐变至 #1565B8）。
 * 仅 admin 角色可访问（后端已二次鉴权，非 admin 返回 403）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  List,
  Row,
  Select,
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

/** 与 BFF getErrorStats 输出对齐 */
interface LogEntryView {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  code: number;
  message: string;
  path: string;
  staffId: string;
  patientId: string;
  stack?: string;
}

interface ErrorStatsView {
  period: { from: string; to: string; minutes: number };
  total: number;
  byLevel: Record<'error' | 'warn' | 'info', number>;
  byCode: Array<{ code: number; count: number }>;
  byPath: Array<{ path: string; count: number }>;
  recent: LogEntryView[];
}

/** 窗口选项：近 1 小时 / 6 小时 / 24 小时 */
const PERIOD_OPTIONS = [
  { value: 60, label: '近 1 小时' },
  { value: 360, label: '近 6 小时' },
  { value: 1440, label: '近 24 小时' },
];

/** 级别标签配色 */
const LEVEL_COLOR: Record<LogEntryView['level'], string> = {
  error: 'red',
  warn: 'orange',
  info: 'blue',
};

export default function ErrorMonitorPage() {
  const [minutes, setMinutes] = useState<number>(60);
  const [data, setData] = useState<ErrorStatsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (win: number) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/admin/errors/stats?minutes=${win}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ErrorStatsView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

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
            错误监控
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 0 }}>
            运行时错误日志聚合 · 总量 / 分级 / 高频错误码 / 高频路径 / 近期明细 —— 让每一条 500 都可排查
          </Paragraph>
        </div>

        {/* 窗口选择 + 刷新 */}
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={minutes}
            options={PERIOD_OPTIONS}
            style={{ width: 160 }}
            onChange={(v) => setMinutes(v)}
          />
          <Button onClick={() => void load(minutes)}>刷新</Button>
        </Space>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载错误统计中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load(minutes)}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && data && data.total === 0 && (
          <Alert
            type="success"
            showIcon
            message="所选窗口内暂无错误日志，系统运行正常。"
            description="当出现未捕获异常或依赖故障时，将自动记录到此面板。"
          />
        )}

        {!loading && !error && data && data.total > 0 && (
          <>
            {/* 概览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Text type="secondary">窗口内错误总数</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: DEEP_SEA }}>{data.total}</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Text type="secondary">error 级</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#cf1322' }}>
                    {data.byLevel.error}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Text type="secondary">warn 级</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#d48806' }}>
                    {data.byLevel.warn}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Text type="secondary">info 级</Text>
                  <div style={{ fontSize: 28, fontWeight: 600, color: DEEP_SEA_LIGHT }}>
                    {data.byLevel.info}
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 高频错误码 */}
              <Col span={12}>
                <Card title="高频错误码 Top10">
                  <List
                    size="small"
                    dataSource={data.byCode}
                    locale={{ emptyText: '暂无错误码' }}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          <Tag color={item.code >= 50000 ? 'red' : 'orange'}>{item.code}</Tag>
                          <Text type="secondary">{item.count} 次</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* 高频路径 */}
              <Col span={12}>
                <Card title="高频错误路径 Top10">
                  <List
                    size="small"
                    dataSource={data.byPath}
                    locale={{ emptyText: '暂无路径' }}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          <Text code>{item.path}</Text>
                          <Text type="secondary">{item.count} 次</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {/* 近期明细 */}
            <Card title="近期错误明细">
              <Table
                rowKey={(r) => `${r.timestamp}-${r.code}-${r.message}`}
                size="small"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                dataSource={data.recent}
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
                      {r.stack || '（无堆栈）'}
                    </pre>
                  ),
                }}
                columns={[
                  {
                    title: '时间',
                    dataIndex: 'timestamp',
                    width: 170,
                    render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
                  },
                  {
                    title: '级别',
                    dataIndex: 'level',
                    width: 80,
                    render: (v: LogEntryView['level']) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag>,
                  },
                  {
                    title: '错误码',
                    dataIndex: 'code',
                    width: 90,
                    render: (v: number) => <Tag color={v >= 50000 ? 'red' : 'orange'}>{v}</Tag>,
                  },
                  { title: '错误摘要', dataIndex: 'message', ellipsis: true },
                  {
                    title: '路径',
                    dataIndex: 'path',
                    width: 200,
                    ellipsis: true,
                    render: (v: string) => <Text code>{v || '-'}</Text>,
                  },
                  { title: '员工', dataIndex: 'staffId', width: 100, render: (v: string) => v || '-' },
                  { title: '患者', dataIndex: 'patientId', width: 100, render: (v: string) => v || '-' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
