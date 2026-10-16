/**
 * 健澜科技 jlmedaios - M180-B 医院运营分析深化页（质量与体验，仅 admin）
 *
 * 运营分析要有数据，不能拍脑袋：
 *  - 多期趋势：门诊/住院/手术/财务四域指标斜率、变化率、波动，判定 上升/下降/平稳；
 *  - 运营对标：与全院标杆逐项对照，领先 / 持平 / 落后；
 *  - 运营预测：线性回归外推未来 N 期，点预测 + 95% 置信区间 + 拟合优度。
 *
 * 三态：loading / error（可重试）/ empty（暂无运营数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF opsAnalysis 输出对齐的类型 ---------------- */
interface TrendMetric {
  metricKey: string;
  metricName: string;
  domain: string;
  unit: string;
  points: Array<{ period: string; value: number }>;
  slope: number;
  changePct: number;
  volatility: number;
  trend: 'up' | 'down' | 'flat';
  interpretation: string;
}
interface TrendReport {
  deptCode: string;
  period: string;
  trendType: string;
  metricCount: number;
  metrics: TrendMetric[];
  summary: { up: number; down: number; flat: number };
}
interface BenchmarkItem {
  metricKey: string;
  metricName: string;
  domain: string;
  unit: string;
  deptValue: number;
  benchmarkValue: number;
  gapPct: number;
  rating: 'leading' | 'on_par' | 'lagging';
  note: string;
}
interface BenchmarkReport {
  leadingCount: number;
  laggingCount: number;
  overallRating: 'leading' | 'on_par' | 'lagging';
  items: BenchmarkItem[];
}
interface ForecastMetric {
  metricKey: string;
  metricName: string;
  domain: string;
  unit: string;
  historyPoints: Array<{ period: string; value: number }>;
  confidence: number;
  forecasts: Array<{ horizon: number; targetPeriod: string; value: number; lowerBound: number; upperBound: number }>;
  note: string;
}
interface ForecastReport {
  anchorPeriod: string;
  days: number;
  metrics: ForecastMetric[];
  note: string;
}
interface OpsAnalysisData {
  dept: string;
  period: string;
  demo: boolean;
  hasData?: boolean;
  message?: string;
  trend?: TrendReport;
  benchmark?: BenchmarkReport;
  forecast?: ForecastReport;
  generatedAt?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const TREND_TAG: Record<string, { color: string; text: string }> = {
  up: { color: 'green', text: '上升' },
  down: { color: 'red', text: '下降' },
  flat: { color: 'default', text: '平稳' },
};
const RATING_TAG: Record<string, { color: string; text: string }> = {
  leading: { color: 'green', text: '领先' },
  on_par: { color: 'default', text: '持平' },
  lagging: { color: 'red', text: '落后' },
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function OpsAnalysisPage() {
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [dept, setDept] = useState<string>('internal_medicine');
  const [period, setPeriod] = useState<string>(thisMonth);
  const [days, setDays] = useState<number>(6);
  const [data, setData] = useState<OpsAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/v1/admin/ops/analysis?dept=${encodeURIComponent(dept)}&period=${encodeURIComponent(period)}&days=${days}`;
      const d = await getJson<OpsAnalysisData>(url);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dept, period, days]);

  useEffect(() => { load(); }, [load]);

  const trendColumns: ColumnsType<TrendMetric> = [
    { title: '指标', dataIndex: 'metricName', key: 'metricName' },
    { title: '域', dataIndex: 'domain', key: 'domain', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '趋势', dataIndex: 'trend', key: 'trend', render: (v: 'up' | 'down' | 'flat') => {
      const t = TREND_TAG[v]; return <Tag color={t.color}>{t.text}</Tag>;
    } },
    { title: '变化率', dataIndex: 'changePct', key: 'changePct', render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: '每期斜率', dataIndex: 'slope', key: 'slope' },
    { title: '波动 CV', dataIndex: 'volatility', key: 'volatility', render: (v: number) => v.toFixed(3) },
    { title: '解读', dataIndex: 'interpretation', key: 'interpretation' },
  ];

  const benchmarkColumns: ColumnsType<BenchmarkItem> = [
    { title: '指标', dataIndex: 'metricName', key: 'metricName' },
    { title: '科室值', dataIndex: 'deptValue', key: 'deptValue' },
    { title: '标杆值', dataIndex: 'benchmarkValue', key: 'benchmarkValue' },
    { title: '差距', dataIndex: 'gapPct', key: 'gapPct', render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: '评级', dataIndex: 'rating', key: 'rating', render: (v: 'leading' | 'on_par' | 'lagging') => {
      const t = RATING_TAG[v]; return <Tag color={t.color}>{t.text}</Tag>;
    } },
    { title: '说明', dataIndex: 'note', key: 'note' },
  ];

  return (
    <Layout style={{ background: VI.bg }}>
      <div style={{
        background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
        padding: '20px 24px', color: '#fff',
      }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院运营分析深化（M180-B）</Title>
        <Paragraph style={{ color: VI.accentSoft, margin: '4px 0 0' }}>
          【质量与体验】多期趋势 / 标杆对标 / 未来 N 期线性回归预测 —— 运营分析要有数据，不能拍脑袋
        </Paragraph>
      </div>
      <Content style={{ padding: 16 }}>
        <Card size="small" style={{ marginBottom: 12 }}>
          <Row gutter={12} align="middle">
            <Col><span>科室编码：</span><Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: 180 }} /></Col>
            <Col><span>锚点周期：</span><Input value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 120 }} placeholder="YYYY-MM" /></Col>
            <Col><span>预测期数：</span><Input type="number" value={days} min={1} max={24} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 90 }} /></Col>
            <Col><Button type="primary" onClick={load} loading={loading}>查询</Button></Col>
          </Row>
        </Card>

        {error && <Alert type="error" style={{ marginBottom: 12 }} message={error} description={<Button size="small" onClick={load}>重试</Button>} />}
        {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
        {!loading && !error && !data?.hasData && (
          <Alert type="info" message={data?.message || '暂无运营数据'} />
        )}

        {data?.hasData && data.trend && (
          <>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={8}><Card size="small"><Statistic title="上升指标" value={data.trend.summary.up} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="下降指标" value={data.trend.summary.down} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="平稳指标" value={data.trend.summary.flat} /></Card></Col>
            </Row>

            <Card size="small" title="多期趋势分析" style={{ marginBottom: 12 }}>
              <Table rowKey="metricKey" size="small" columns={trendColumns} dataSource={data.trend.metrics} pagination={false} />
            </Card>
          </>
        )}

        {data?.hasData && data.benchmark && (
          <Card size="small" title={`运营对标（领先 ${data.benchmark.leadingCount} 项 / 落后 ${data.benchmark.laggingCount} 项）`} style={{ marginBottom: 12 }}>
            <Table rowKey="metricKey" size="small" columns={benchmarkColumns} dataSource={data.benchmark.items} pagination={{ pageSize: 10 }} />
          </Card>
        )}

        {data?.hasData && data.forecast && (
          <Card size="small" title={`运营预测（未来 ${data.forecast.days} 期，线性回归 + 95% 置信区间）`} style={{ marginBottom: 12 }}>
            <Paragraph type="secondary">{data.forecast.note}</Paragraph>
            {data.forecast.metrics.slice(0, 6).map((m) => (
              <div key={m.metricKey} style={{ marginBottom: 16 }}>
                <Paragraph strong style={{ marginBottom: 4 }}>
                  {m.metricName}（拟合优度 R²={m.confidence.toFixed(2)}）
                </Paragraph>
                <ReactECharts
                  style={{ height: 220 }}
                  option={{
                    tooltip: { trigger: 'axis' },
                    legend: { data: ['历史', '预测', '置信区间'] },
                    grid: { left: 50, right: 20, top: 30, bottom: 30 },
                    xAxis: { type: 'category', data: [...m.historyPoints.map((p) => p.period), ...m.forecasts.map((f) => f.targetPeriod)] },
                    yAxis: { type: 'value', scale: true },
                    series: [
                      {
                        name: '历史', type: 'line', symbol: 'circle',
                        data: [...m.historyPoints.map((p) => p.value), ...m.forecasts.map(() => null)],
                        itemStyle: { color: VI.accent },
                      },
                      {
                        name: '预测', type: 'line', symbol: 'diamond',
                        data: [...m.historyPoints.map(() => null), ...m.forecasts.map((f) => f.value)],
                        itemStyle: { color: '#cf1322' }, lineStyle: { type: 'dashed' },
                      },
                      {
                        name: '置信区间', type: 'line',
                        data: [...m.historyPoints.map(() => null), ...m.forecasts.map((f) => f.upperBound)],
                        lineStyle: { opacity: 0 }, stack: 'band', symbol: 'none',
                      },
                      {
                        name: '置信区间', type: 'line',
                        data: [...m.historyPoints.map(() => null), ...m.forecasts.map((f) => f.lowerBound - f.upperBound)],
                        lineStyle: { opacity: 0 }, stack: 'band', symbol: 'none',
                        areaStyle: { color: VI.accentSoft, opacity: 0.25 },
                      },
                    ],
                  }}
                />
              </div>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
