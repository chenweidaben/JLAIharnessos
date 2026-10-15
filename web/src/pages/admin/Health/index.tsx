/**
 * 健澜科技 jlmedaios - M124-D 系统健康检查总览页（仅 admin，运维工具）
 *
 * 展示 BFF /api/v1/admin/health 聚合结果：整体健康结论、数据库与 LLM 可达性、
 * 磁盘 / 内存使用率、今日请求数、错误率、最近备份时间。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无运行流量）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF buildSystemHealthDashboard 输出对齐 */
interface SystemHealthDashboard {
  dbStatus: 'up' | 'down';
  llmStatus: 'up' | 'down';
  diskUsage: number;
  memoryUsage: number;
  todayRequests: number;
  errorRate: number;
  lastBackup: string | null;
}

interface HealthResponse {
  dashboard: SystemHealthDashboard;
  overall: 'healthy' | 'degraded' | 'down';
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const OVERALL_META: Record<
  HealthResponse['overall'],
  { color: string; text: string }
> = {
  healthy: { color: 'success', text: '健康' },
  degraded: { color: 'warning', text: '降级运行' },
  down: { color: 'error', text: '故障' },
};

function upTag(status: 'up' | 'down') {
  return status === 'up' ? <Tag color="green">正常</Tag> : <Tag color="red">不可达</Tag>;
}

function pctColor(pct: number): 'success' | 'normal' | 'exception' {
  if (pct >= 90) return 'exception';
  if (pct >= 75) return 'normal';
  return 'success';
}

function fmtTime(iso: string | null): string {
  if (!iso) return '暂无记录';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/health');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as HealthResponse);
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

  const d = data?.dashboard;
  const overall = data?.overall ?? 'healthy';
  const overallMeta = OVERALL_META[overall];

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
          系统健康检查
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          运维工具 · 仅 admin 可见 · 实时探活，不含任何业务 PII
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在巡检系统健康状态…" />
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

        {/* empty 态：成功返回但尚无运行流量 */}
        {!loading && !error && (!d || d.todayRequests === 0) && (
          <Alert
            type="info"
            showIcon
            message="暂无运行流量数据。BFF 正常接收请求后将自动开始巡检，稍后刷新即可。"
          />
        )}

        {!loading && !error && d && d.todayRequests > 0 && (
          <>
            {/* 整体健康结论横幅 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>整体健康状态</span>
                  <Tag color={overallMeta.color} style={{ fontSize: 16, padding: '4px 16px' }}>
                    {overallMeta.text}
                  </Tag>
                </Col>
                {data?.demo && (
                  <Col>
                    <Tag color="default">演示模式（DEMO_MODE）</Tag>
                  </Col>
                )}
              </Row>
            </Card>

            {/* 关键依赖状态 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="数据库" valueRender={() => upTag(d.dbStatus)} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="LLM 网关" valueRender={() => upTag(d.llmStatus)} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="最近备份" value={fmtTime(d.lastBackup)} />
                </Card>
              </Col>
            </Row>

            {/* 资源与流量指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title="磁盘使用率">
                  <Progress percent={d.diskUsage} size="small" status={pctColor(d.diskUsage)} />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="内存使用率">
                  <Progress percent={d.memoryUsage} size="small" status={pctColor(d.memoryUsage)} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="今日请求数" value={d.todayRequests} suffix="次" />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Card title="今日错误率">
                  <Progress
                    percent={d.errorRate}
                    size="small"
                    status={d.errorRate >= 5 ? 'exception' : d.errorRate >= 1 ? 'normal' : 'success'}
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
