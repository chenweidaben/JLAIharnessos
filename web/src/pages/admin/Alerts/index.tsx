/**
 * 健澜科技 jlmedaios - M136-D 监控告警中心页（仅 admin，运维工具）
 *
 * 展示 BFF /api/v1/admin/alerts 聚合结果：当前触发中的红/黄告警、四项运行指标快照、
 * 以及阈值规则图例。三态：loading（加载中）/ error（失败可重试）/ empty（运行正常）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF alertingAggregator.Alert 对齐 */
interface MonitoringAlert {
  id: string;
  level: 'red' | 'yellow';
  source: 'api-error-rate' | 'p95-latency' | 'disk' | 'memory' | 'custom';
  message: string;
  value: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
}

interface AlertsResponse {
  alerts: MonitoringAlert[];
  metrics: {
    apiErrorRate: number;
    p95LatencyMs: number;
    diskUsedRatio: number;
    memoryUsedRatio: number;
  };
  thresholds: {
    errorRateRed: number;
    p95YellowMs: number;
    diskYellowRatio: number;
    memoryRedRatio: number;
  };
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const LEVEL_META: Record<'red' | 'yellow', { color: string; text: string; badge: 'error' | 'warning' }> = {
  red: { color: 'red', text: '紧急', badge: 'error' },
  yellow: { color: 'gold', text: '预警', badge: 'warning' },
};

const SOURCE_META: Record<MonitoringAlert['source'], string> = {
  'api-error-rate': 'API错误率',
  'p95-latency': 'P95延迟',
  disk: '磁盘',
  memory: '内存',
  custom: '自定义',
};

function fmtPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${(ratio * 100).toFixed(2)}%`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/alerts');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as AlertsResponse);
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

  const alerts = data?.alerts ?? [];
  const redCount = alerts.filter((a) => a.level === 'red').length;

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
          监控告警中心
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          运维工具 · 仅 admin 可见 · 阈值自动判定，不含任何业务 PII
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在拉取监控告警…" />
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

        {!loading && !error && data && (
          <>
            {/* 告警概览横幅 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <Badge
                    status={alerts.length === 0 ? 'success' : redCount > 0 ? 'error' : 'warning'}
                    text={
                      alerts.length === 0 ? (
                        <Text strong>运行正常，当前无触发告警</Text>
                      ) : (
                        <Text strong>
                          共 {alerts.length} 条告警（紧急 {redCount} / 预警 {alerts.length - redCount}）
                        </Text>
                      )
                    }
                  />
                </Col>
                {data.demo && (
                  <Col>
                    <Tag color="default">演示模式（DEMO_MODE）</Tag>
                  </Col>
                )}
              </Row>
            </Card>

            {/* 当前运行指标快照 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="API 错误率" value={fmtPct(data.metrics.apiErrorRate)} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="P95 延迟"
                    value={Math.round(data.metrics.p95LatencyMs)}
                    suffix="ms"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="磁盘使用率" value={fmtPct(data.metrics.diskUsedRatio)} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="内存使用率" value={fmtPct(data.metrics.memoryUsedRatio)} />
                </Card>
              </Col>
            </Row>

            {/* 阈值规则图例（持续优化：阈值由 BFF 下发，与后端保持一致） */}
            <Card size="small" title="阈值规则" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={6}>
                  <Tag color="red">错误率 &gt; {(data.thresholds.errorRateRed * 100).toFixed(0)}%</Tag>
                </Col>
                <Col span={6}>
                  <Tag color="gold">P95 &gt; {data.thresholds.p95YellowMs}ms</Tag>
                </Col>
                <Col span={6}>
                  <Tag color="gold">磁盘 &gt; {(data.thresholds.diskYellowRatio * 100).toFixed(0)}%</Tag>
                </Col>
                <Col span={6}>
                  <Tag color="red">内存 &gt; {(data.thresholds.memoryRedRatio * 100).toFixed(0)}%</Tag>
                </Col>
              </Row>
            </Card>

            {/* 告警列表：空态展示运行正常 */}
            {alerts.length === 0 ? (
              <Alert
                type="success"
                showIcon
                message="当前所有指标均在阈值之内，系统运行平稳。"
              />
            ) : (
              <Card title="触发中的告警">
                <List
                  dataSource={alerts}
                  renderItem={(a) => {
                    const lv = LEVEL_META[a.level];
                    return (
                      <List.Item key={a.id}>
                        <List.Item.Meta
                          title={
                            <span>
                              <Tag color={lv.color}>{lv.text}</Tag>
                              <Tag>{SOURCE_META[a.source]}</Tag>
                              {a.acknowledged ? <Tag>已签收</Tag> : <Badge status={lv.badge} text="未签收" />}
                              <span style={{ marginLeft: 8 }}>{a.message}</span>
                            </span>
                          }
                          description={
                            <Text type="secondary">
                              观测值 {a.value} / 阈值 {a.threshold} · 触发于 {fmtTime(a.triggeredAt)} · id{' '}
                              {a.id}
                            </Text>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
