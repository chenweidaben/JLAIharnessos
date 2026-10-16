/**
 * 健澜科技 jlmedaios - M168-D 系统运维智能化面板（仅 admin）
 *
 * 【AI深化与智能运营】展示 GET /api/v1/admin/ops/monitoring 返回的四组数据：
 *  - 智能监控：API 响应时间（P50/P95/P99）、错误率（按路由 / 按时间窗）、
 *    数据库连接池（使用率 / 等待时间）、缓存命中率、磁盘空间；
 *  - 异常检测：五类异常（P95 毛刺 / 错误率突增 / 连接池饱和 / 缓存击穿 / 磁盘告急），
 *    含当前值 / 基线 / 偏离% / z-Score；
 *  - 智能告警：P1/P2/P3 分级、送达渠道、去重键、是否需要确认；
 *  - 自动修复建议：有序处置步骤（可自动 / 需人工）、风险等级、预期收益、回滚预案。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF OpsMonitorView 输出对齐的类型 ---------------- */

interface ApiLatencyStats {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  sampleCount: number;
}

interface RouteErrorRow {
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  errorRatePct: number;
  requests: number;
  errors: number;
}

interface TimeErrorRow {
  window: string;
  errorRatePct: number;
  requests: number;
  errors: number;
}

interface DbPoolMetrics {
  active: number;
  idle: number;
  max: number;
  usagePct: number;
  waitMsAvg: number;
  waitMsP99: number;
  acquisitionTimeouts: number;
}

interface CacheMetrics {
  hitRatePct: number;
  hits: number;
  misses: number;
  evictions: number;
}

interface DiskMetrics {
  path: string;
  totalGb: number;
  usedGb: number;
  usedPct: number;
  inodeUsedPct: number;
}

interface MonitoringMetrics {
  apiLatency: ApiLatencyStats;
  routeErrors: RouteErrorRow[];
  timeErrors: TimeErrorRow[];
  dbPool: DbPoolMetrics;
  cache: CacheMetrics;
  disk: DiskMetrics[];
  healthScore: number;
}

type AnomalyKind =
  | 'LATENCY_P95_SPIKE'
  | 'ERROR_RATE_SPIKE'
  | 'DB_POOL_SATURATION'
  | 'CACHE_MISS_DROP'
  | 'DISK_SPACE_RISK';

type Severity = 'info' | 'warning' | 'critical';

interface Anomaly {
  id: string;
  kind: AnomalyKind;
  severity: Severity;
  metric: string;
  current: number;
  baseline: number;
  deviationPct: number;
  zScore: number;
  threshold: number;
  message: string;
}

interface OpsAlert {
  alertId: string;
  level: 'P1' | 'P2' | 'P3';
  title: string;
  content: string;
  channel: Array<'phone' | 'sms' | 'im' | 'email'>;
  dedupKey: string;
  needAck: boolean;
  runbookUrl: string;
}

interface RemediationStep {
  order: number;
  action: string;
  automated: boolean;
  risk: 'low' | 'medium' | 'high';
  expectedEffect: string;
}

interface RemediationPlan {
  issueId: string;
  kind: AnomalyKind;
  summary: string;
  steps: RemediationStep[];
  rollback: string;
  estimatedRecoveryMin: number;
}

interface OpsMonitorView {
  monitoring: MonitoringMetrics;
  anomalies: Anomaly[];
  alerts: OpsAlert[];
  remediations: RemediationPlan[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SEVERITY_COLOR: Record<Severity, string> = {
  info: 'blue',
  warning: 'orange',
  critical: 'red',
};

const KIND_LABEL: Record<AnomalyKind, string> = {
  LATENCY_P95_SPIKE: 'P95 毛刺',
  ERROR_RATE_SPIKE: '错误率突增',
  DB_POOL_SATURATION: '连接池饱和',
  CACHE_MISS_DROP: '缓存击穿',
  DISK_SPACE_RISK: '磁盘告急',
};

const LEVEL_COLOR: Record<OpsAlert['level'], string> = {
  P1: 'red',
  P2: 'orange',
  P3: 'blue',
};

const RISK_COLOR: Record<RemediationStep['risk'], string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

/** 千分位格式化 */
const fmtInt = (v: number): string => v.toLocaleString('zh-CN');

export default function OpsMonitorPage() {
  const [data, setData] = useState<OpsMonitorView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/ops/monitoring');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as OpsMonitorView);
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

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: VI.bg }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="智能运维数据加载中…" />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh', background: VI.bg }}>
        <Content style={{ padding: 48 }}>
          <Alert
            type="error"
            showIcon
            message="智能运维数据加载失败"
            description={error}
            action={
              <Button size="small" danger onClick={() => void load()}>
                重试
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout style={{ minHeight: '100vh', background: VI.bg }}>
        <Content style={{ padding: 48, textAlign: 'center' }}>
          <Paragraph type="secondary">暂无智能运维数据</Paragraph>
        </Content>
      </Layout>
    );
  }

  const { monitoring, anomalies, alerts, remediations } = data;
  const worstRoute = monitoring.routeErrors.reduce(
    (worst, r) => (r.errorRatePct > worst.errorRatePct ? r : worst),
    monitoring.routeErrors[0],
  );

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          智能运维中心
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【AI深化与智能运营】监控 → 异常检测 → 智能告警 → 自动修复，闭环处置不只报警
        </Paragraph>
      </div>

      <Content style={{ padding: 24 }}>
        {/* ① 核心指标总览 */}
        <Row gutter={[16, 16]}>
          <Col span={4}>
            <Card>
              <Statistic title="健康分" value={monitoring.healthScore} suffix="/100" />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="API P95" value={monitoring.apiLatency.p95Ms} suffix="ms" valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="最高路由错误率"
                value={worstRoute.errorRatePct}
                suffix="%"
                precision={1}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="连接池使用率"
                value={monitoring.dbPool.usagePct}
                suffix="%"
                precision={1}
                valueStyle={{ color: '#d46b08' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="缓存命中率"
                value={monitoring.cache.hitRatePct}
                suffix="%"
                precision={1}
                valueStyle={{ color: '#d46b08' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="已识别异常" value={anomalies.length} suffix="项" valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        {/* ② 明细监控项 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card title="API 响应时间（ms）" size="small">
              <Row>
                <Col span={8}>
                  <Statistic title="P50" value={monitoring.apiLatency.p50Ms} />
                </Col>
                <Col span={8}>
                  <Statistic title="P95" value={monitoring.apiLatency.p95Ms} valueStyle={{ color: '#cf1322' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="P99" value={monitoring.apiLatency.p99Ms} />
                </Col>
              </Row>
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                样本量 {fmtInt(monitoring.apiLatency.sampleCount)}，平均 {monitoring.apiLatency.avgMs}ms
              </Paragraph>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="数据库连接池" size="small">
              <Statistic
                title={`活跃连接 ${monitoring.dbPool.active}/${monitoring.dbPool.max}（空闲 ${monitoring.dbPool.idle}）`}
                value={monitoring.dbPool.usagePct}
                suffix="%"
                precision={1}
              />
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                等待平均 {monitoring.dbPool.waitMsAvg}ms / P99 {monitoring.dbPool.waitMsP99}ms；本周期获取超时{' '}
                {monitoring.dbPool.acquisitionTimeouts} 次
              </Paragraph>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="磁盘空间" size="small">
              {monitoring.disk.map((d) => (
                <Row key={d.path} justify="space-between" style={{ marginBottom: 4 }}>
                  <span>{d.path}</span>
                  <span>
                    {d.usedGb}/{d.totalGb}GB（{d.usedPct}%）
                  </span>
                </Row>
              ))}
            </Card>
          </Col>
        </Row>

        {/* ③ 异常检测 */}
        <Card title="异常检测（业务阈值 + z-Score 双判据）" size="small" style={{ marginTop: 16 }}>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={anomalies}
            columns={[
              { title: '异常', dataIndex: 'kind', render: (kind: AnomalyKind) => KIND_LABEL[kind] },
              {
                title: '严重度',
                dataIndex: 'severity',
                render: (s: Severity) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
              },
              { title: '当前值', dataIndex: 'current' },
              { title: '基线', dataIndex: 'baseline' },
              { title: '偏离%', dataIndex: 'deviationPct' },
              { title: 'z-Score', dataIndex: 'zScore' },
              { title: '触发阈值', dataIndex: 'threshold' },
              { title: '描述', dataIndex: 'message' },
            ]}
          />
        </Card>

        {/* ④ 智能告警 */}
        <Card title="智能告警（分级送达 + 去重 + 确认闭环）" size="small" style={{ marginTop: 16 }}>
          <Table
            rowKey="alertId"
            size="small"
            pagination={false}
            dataSource={alerts}
            columns={[
              { title: '级别', dataIndex: 'level', render: (l: OpsAlert['level']) => <Tag color={LEVEL_COLOR[l]}>{l}</Tag> },
              { title: '标题', dataIndex: 'title' },
              {
                title: '渠道',
                dataIndex: 'channel',
                render: (channels: OpsAlert['channel']) => (
                  <Space size={4}>
                    {channels.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </Space>
                ),
              },
              { title: '去重键', dataIndex: 'dedupKey' },
              { title: '需确认', dataIndex: 'needAck', render: (v: boolean) => (v ? '是' : '否') },
              { title: '处置手册', dataIndex: 'runbookUrl' },
            ]}
          />
        </Card>

        {/* ⑤ 自动修复建议 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {remediations.map((plan) => (
            <Col span={8} key={plan.issueId}>
              <Card title={`${KIND_LABEL[plan.kind]} · 修复建议`} size="small">
                <Paragraph type="secondary">{plan.summary}</Paragraph>
                {plan.steps.map((step) => (
                  <Row key={step.order} style={{ marginBottom: 8 }}>
                    <Col span={22} offset={2}>
                      <Space direction="vertical" size={2}>
                        <span>
                          {step.order}. {step.action}
                        </span>
                        <Space size={4}>
                          <Tag color={RISK_COLOR[step.risk]}>风险 {step.risk}</Tag>
                          <Tag color={step.automated ? 'green' : 'default'}>{step.automated ? '可自动执行' : '需人工'}</Tag>
                        </Space>
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          预期：{step.expectedEffect}
                        </Paragraph>
                      </Space>
                    </Col>
                  </Row>
                ))}
                <Alert
                  type="warning"
                  showIcon
                  size="small"
                  style={{ marginTop: 8 }}
                  message={`回滚预案：${plan.rollback}`}
                  description={`预计恢复时长 ${plan.estimatedRecoveryMin} 分钟`}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Content>
    </Layout>
  );
}
