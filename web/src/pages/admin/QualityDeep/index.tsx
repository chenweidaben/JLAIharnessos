/**
 * 健澜科技 jlmedaios - M172-B 医院质量与安全管理深化页（管理驾驶舱，仅 admin）
 *
 * 【安全质量与运营·核心主张】质量指标用国家口径，不自创：
 *   - 体系：医疗 / 护理 / 药事 / 患者安全 四维国家口径指标目录；
 *   - 风险：科室当前读数对照国家达标线，红（critical）/ 黄（warning）/ 绿（达标）；
 *   - 趋势：重点指标近 6 期最小二乘外推未来 3 期，提示是否将越线；
 *   - 改进：对红黄项生成可落地措施（谁来做、做到多少、多紧急），对接 PDCA。
 *
 * 患者安全（跌倒/坠床/压疮/给药错误/输血反应）目标零发生，任何阳性即红线。
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Segmented, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type QualityDomain = 'medical' | 'nursing' | 'pharmacy' | 'patient_safety';
type MetricDirection = 'lower_better' | 'higher_better';
type RiskLevel = 'critical' | 'warning' | 'ok';
type TrendKind = 'improving' | 'worsening' | 'stable';

interface QualityMetricDef {
  code: string;
  name: string;
  domain: QualityDomain;
  unit: string;
  direction: MetricDirection;
  threshold: number;
  caliber: string;
}

interface DeepQualitySystem {
  generatedAt: string;
  domains: Array<{ code: QualityDomain; name: string; metrics: QualityMetricDef[] }>;
  totalMetrics: number;
  summary: Record<QualityDomain, number>;
}

interface QualityRisk {
  dept: string;
  code: string;
  name: string;
  domain: QualityDomain;
  value: number;
  threshold: number;
  unit: string;
  direction: MetricDirection;
  deviation: number;
  level: RiskLevel;
  message: string;
}

interface QualityImprovement {
  code: string;
  name: string;
  domain: QualityDomain;
  unit: string;
  direction: MetricDirection;
  current: number;
  threshold: number;
  gap: number;
  measure: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  target: string;
}

interface QualityTrend {
  metricCode: string;
  metricName: string;
  direction: MetricDirection;
  mean: number;
  slopePerPeriod: number;
  trend: TrendKind;
  forecast: number[];
  forecastEnd: number;
  willBreach: boolean;
  underpowered: boolean;
}

interface DeepResponse {
  system: DeepQualitySystem;
  risks: QualityRisk[];
  improvements: QualityImprovement[];
  trends: QualityTrend[];
  demo: boolean;
  dept: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const DOMAIN_META: Record<QualityDomain, { label: string; color: string }> = {
  medical: { label: '医疗质量', color: 'blue' },
  nursing: { label: '护理质量', color: 'cyan' },
  pharmacy: { label: '药事质量', color: 'geekblue' },
  patient_safety: { label: '患者安全', color: 'red' },
};

const LEVEL_META: Record<RiskLevel, { label: string; color: string }> = {
  critical: { label: '红线', color: 'red' },
  warning: { label: '黄线', color: 'orange' },
  ok: { label: '达标', color: 'green' },
};

const TREND_META: Record<TrendKind, { label: string; color: string }> = {
  improving: { label: '向好', color: 'green' },
  worsening: { label: '向坏', color: 'red' },
  stable: { label: '平稳', color: 'default' },
};

const PRIORITY_META: Record<'high' | 'medium' | 'low', { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'default' },
};

const DEPT_OPTIONS = [
  { label: '心内科', value: 'IN' },
  { label: '普外科', value: 'SU' },
  { label: '护理部', value: 'NU' },
];

export default function QualityDeepPage() {
  const [dept, setDept] = useState<string>('IN');
  const [data, setData] = useState<DeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/admin/quality/deep?dept=${encodeURIComponent(d)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DeepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(dept);
  }, [dept, load]);

  const system = data?.system;
  const criticalCount = data?.risks.filter((r) => r.level === 'critical').length ?? 0;
  const warningCount = data?.risks.filter((r) => r.level === 'warning').length ?? 0;

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
          质量与安全管理深化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 指标全部国家口径，不自创 · 患者安全目标零发生
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Segmented options={DEPT_OPTIONS} value={dept} onChange={(v) => setDept(String(v))} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总国家口径质量指标…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => load(dept)}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !system && (
          <Alert
            type="info"
            showIcon
            message="暂无质量指标样本。接入质控/护理/药事数据平台后将自动成盘。"
          />
        )}

        {!loading && !error && system && (
          <>
            {data?.demo && (
              <Alert
                type="warning"
                showIcon"
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实质量指标采集，页面仅用于演示国家口径质量驾驶舱效果。"
              />
            )}

            {/* 结论横幅 */}
            <Card style={{ marginBottom: 16, borderLeft: `4px solid ${VI.accent}` }}>
              <Text strong style={{ fontSize: 16, color: VI.deep }}>
                {data?.dept} 质量与安全驾驶舱：国家口径指标共 {system.totalMetrics} 项
                （医疗 {system.summary.medical} / 护理 {system.summary.nursing} / 药事{' '}
                {system.summary.pharmacy} / 患者安全 {system.summary.patient_safety}）。
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="red">红线 {criticalCount}</Tag>
                <Tag color="orange">黄线 {warningCount}</Tag>
              </div>
            </Card>

            {/* 风险看板 */}
            <Card title="质量风险看板（对照国家达标线）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="code"
                pagination={false}
                dataSource={data?.risks ?? []}
                size="small"
                locale={{ emptyText: '本期所测指标全部达标，暂无红黄风险' }}
                columns={[
                  {
                    title: '维度',
                    dataIndex: 'domain',
                    width: 110,
                    render: (v: QualityDomain) => <Tag color={DOMAIN_META[v].color}>{DOMAIN_META[v].label}</Tag>,
                  },
                  { title: '指标', dataIndex: 'name' },
                  {
                    title: '当前值',
                    width: 110,
                    render: (_: unknown, r: QualityRisk) => `${r.value}${r.unit}`,
                  },
                  {
                    title: '达标线',
                    width: 110,
                    render: (_: unknown, r: QualityRisk) => `${r.threshold}${r.unit}`,
                  },
                  {
                    title: '等级',
                    dataIndex: 'level',
                    width: 90,
                    render: (v: RiskLevel) => <Tag color={LEVEL_META[v].color}>{LEVEL_META[v].label}</Tag>,
                  },
                  { title: '说明', dataIndex: 'message' },
                ]}
              />
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 趋势外推 */}
              <Col span={12}>
                <Card title="重点指标趋势（最小二乘外推未来 3 期）" style={{ height: '100%' }}>
                  <Table
                    rowKey="metricCode"
                    pagination={false}
                    dataSource={data?.trends ?? []}
                    size="small"
                    columns={[
                      { title: '指标', dataIndex: 'metricName' },
                      {
                        title: '走势',
                        dataIndex: 'trend',
                        width: 90,
                        render: (v: TrendKind, r: QualityTrend) => (
                          <Tag color={TREND_META[v].color}>
                            {TREND_META[v].label}
                            {r.willBreach ? '·将越线' : ''}
                          </Tag>
                        ),
                      },
                      {
                        title: '外推期末',
                        width: 110,
                        render: (_: unknown, r: QualityTrend) =>
                          r.underpowered ? '数据不足' : r.forecastEnd,
                      },
                    ]}
                  />
                </Card>
              </Col>

              {/* 国家口径目录 */}
              <Col span={12}>
                <Card title="国家口径指标目录（按维度）" style={{ height: '100%' }}>
                  {system.domains.map((d) => (
                    <div key={d.code} style={{ marginBottom: 12 }}>
                      <Tag color={DOMAIN_META[d.code].color}>{d.name}</Tag>
                      <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                        {d.metrics.map((m) => m.name).join('、')}
                      </Text>
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>

            {/* 改进建议 */}
            <Card title="质量改进建议（针对红黄项：措施 / 责任岗 / 优先级 / 量化目标）">
              <Table
                rowKey="code"
                pagination={false}
                dataSource={data?.improvements ?? []}
                size="small"
                locale={{ emptyText: '当前无待整改项，保持监测' }}
                columns={[
                  { title: '指标', dataIndex: 'name', width: 150 },
                  { title: '改进措施', dataIndex: 'measure' },
                  { title: '责任岗', dataIndex: 'owner', width: 140 },
                  { title: '量化目标', dataIndex: 'target', width: 220 },
                  {
                    title: '优先级',
                    dataIndex: 'priority',
                    width: 90,
                    render: (v: 'high' | 'medium' | 'low') => (
                      <Tag color={PRIORITY_META[v].color}>{PRIORITY_META[v].label}</Tag>
                    ),
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
