/**
 * 健澜科技 jlmedaios - M165-B 医院预算与成本管理深化页（CDSS与运营精细化，仅 admin）
 *
 * 预算管理要真实，不能拍脑袋：
 *  - 按驱动因子（编制人数/门诊人次/床日/设备原值/面积）量价测算四大类预算；
 *  - 逐月跟踪执行率与进度偏差（on_track / warning / over / ahead）；
 *  - 月均运行率年化外推，预测年末超支（green / yellow / red）。
 *
 * 三态：loading / error（可重试）/ empty（未编制预算）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF budgetDeep 输出对齐的类型 ---------------- */

interface CategoryRollup {
  category: string;
  label: string;
  annualBudget: number;
  spentYtd: number;
  executionRate: number;
}

interface ExecutionLineStatus {
  category: string;
  sub: string;
  subName: string;
  annualBudget: number;
  spentYtd: number;
  paceBudget: number;
  executionRate: number;
  paceRate: number;
  variance: number;
  status: 'on_track' | 'warning' | 'over' | 'ahead';
}

interface Execution {
  deptCode: string;
  deptName: string;
  year: number;
  upToMonth: number;
  lines: ExecutionLineStatus[];
  categoryRollup: CategoryRollup[];
  totalBudget: number;
  totalSpent: number;
  overallExecutionRate: number;
}

interface OverrunPrediction {
  category: string;
  annualBudget: number;
  ytdSpent: number;
  monthlyRunRate: number;
  recentRunRate: number;
  projectedYearEnd: number;
  predictedOverrun: number;
  riskLevel: 'green' | 'yellow' | 'red';
}

interface Forecast {
  deptCode: string;
  year: number;
  asOfMonth: number;
  predictions: OverrunPrediction[];
  totalBudget: number;
  totalProjected: number;
  totalOverrun: number;
  overallRisk: 'green' | 'yellow' | 'red';
}

interface BudgetData {
  dept: string;
  year: number;
  demo: boolean;
  hasPlan: boolean;
  deptName?: string;
  message?: string;
  execution?: Execution;
  forecast?: Forecast;
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

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  on_track: { color: 'green', text: '正常' },
  warning: { color: 'orange', text: '预警' },
  over: { color: 'red', text: '超进度' },
  ahead: { color: 'blue', text: '结余' },
};

const RISK_TAG: Record<string, { color: string; text: string }> = {
  green: { color: 'green', text: '安全' },
  yellow: { color: 'orange', text: '关注' },
  red: { color: 'red', text: '超支风险' },
};

/** 元 → 万元 */
const wan = (v: number) => (v / 10000).toFixed(1);

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function BudgetDeepPage() {
  const thisYear = new Date().getFullYear();
  const [dept, setDept] = useState<string>('internal_medicine');
  const [year, setYear] = useState<number>(thisYear);
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!dept.trim()) { setError('请输入科室编码'); return; }
    setLoading(true);
    setError('');
    try {
      const d = await getJson<BudgetData>(
        `/api/v1/admin/budget?dept=${encodeURIComponent(dept.trim())}&year=${year}`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '预算数据加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dept, year]);

  useEffect(() => { void load(); }, [load]);

  /** 大类预算 vs 执行 柱状图 */
  const categoryOption = useMemo(() => {
    const roll = data?.execution?.categoryRollup ?? [];
    return {
      color: [VI.accent, '#f0a04b'],
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${wan(v)} 万元` },
      legend: { data: ['年度预算', '已执行'], bottom: 0 },
      grid: { left: 60, right: 24, top: 24, bottom: 40 },
      xAxis: { type: 'category', data: roll.map((r) => r.label), axisLabel: { color: VI.deep } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万` } },
      series: [
        { name: '年度预算', type: 'bar' as const, data: roll.map((r) => r.annualBudget) },
        { name: '已执行', type: 'bar' as const, data: roll.map((r) => r.spentYtd) },
      ],
    };
  }, [data]);

  /** 超支预测条形图 */
  const forecastOption = useMemo(() => {
    const preds = data?.forecast?.predictions ?? [];
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${wan(v)} 万元` },
      legend: { data: ['年度预算', '年末预测'], bottom: 0 },
      grid: { left: 60, right: 24, top: 24, bottom: 40 },
      xAxis: { type: 'category', data: preds.map((p) => p.category), axisLabel: { color: VI.deep } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万` } },
      series: [
        { name: '年度预算', type: 'bar' as const, data: preds.map((p) => p.annualBudget) },
        { name: '年末预测', type: 'bar' as const, data: preds.map((p) => p.projectedYearEnd),
          itemStyle: { color: '#d4483e' } },
      ],
    };
  }, [data]);

  const exec = data?.execution;
  const fc = data?.forecast;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院预算与成本管理</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          CDSS与运营精细化 · 驱动因子测算 / 执行跟踪 / 超支预测（预算要真实，不拍脑袋）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 查询条件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Typography.Text style={{ color: '#666' }}>科室编码</Typography.Text>
              <Input.Search
                style={{ marginTop: 8 }}
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                enterButton="查询"
                onSearch={load}
                placeholder="如 internal_medicine"
              />
            </Col>
            <Col span={6}>
              <Typography.Text style={{ color: '#666' }}>预算年度</Typography.Text>
              <Input
                style={{ marginTop: 8 }}
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </Col>
            <Col span={6}>
              <Button onClick={load} loading={loading}>刷新</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载预算数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && data && !data.hasPlan && (
          <Alert type="info" showIcon message={data.message || '该科室本年度尚未编制预算。'} />
        )}

        {!loading && !error && data?.hasPlan && exec && fc && (
          <>
            {/* KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="年度预算合计" value={`${wan(exec.totalBudget)} 万元`} valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title={`已执行（截至 ${exec.upToMonth} 月）`} value={`${wan(exec.totalSpent)} 万元`} valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="整体执行率" value={`${(exec.overallExecutionRate * 100).toFixed(1)}%`} valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="年末超支预测"
                    value={`${wan(fc.totalOverrun)} 万元`}
                    valueStyle={{ color: fc.totalOverrun > 0 ? '#d4483e' : '#3f9d63' }}
                  />
                  <Tag color={RISK_TAG[fc.overallRisk].color} style={{ marginTop: 8 }}>
                    {RISK_TAG[fc.overallRisk].text}
                  </Tag>
                </Card>
              </Col>
            </Row>

            {/* 图 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="四大类预算 vs 已执行">
                  <ReactECharts option={categoryOption} style={{ height: 300 }} notMerge />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="年末支出预测（年化运行率外推）">
                  <ReactECharts option={forecastOption} style={{ height: 300 }} notMerge />
                </Card>
              </Col>
            </Row>

            {/* 执行明细 */}
            <Card title="预算执行明细（按进度基准线对照）" style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.category}-${r.sub}`}
                pagination={false}
                dataSource={exec.lines}
                size="small"
                columns={[
                  { title: '大类', dataIndex: 'category', width: 110, render: (v: string) => <Tag color="blue">{v}</Tag> },
                  { title: '子项', dataIndex: 'subName', width: 120 },
                  { title: '年预算(万)', dataIndex: 'annualBudget', width: 110, render: (v: number) => wan(v) },
                  { title: '已花(万)', dataIndex: 'spentYtd', width: 100, render: (v: number) => wan(v) },
                  { title: '进度基准(万)', dataIndex: 'paceBudget', width: 110, render: (v: number) => wan(v) },
                  {
                    title: '执行率', dataIndex: 'executionRate', width: 90,
                    render: (v: number) => `${(v * 100).toFixed(0)}%`,
                  },
                  {
                    title: '状态', dataIndex: 'status', width: 90,
                    render: (v: string) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].text}</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 超支预测 */}
            <Card title="超支预测（仅提示，不自动调账）">
              <Table
                rowKey="category"
                pagination={false}
                dataSource={fc.predictions}
                size="small"
                columns={[
                  { title: '大类', dataIndex: 'category', width: 120, render: (v: string) => <Tag color="blue">{v}</Tag> },
                  { title: '年预算(万)', dataIndex: 'annualBudget', width: 110, render: (v: number) => wan(v) },
                  { title: '已花(万)', dataIndex: 'ytdSpent', width: 100, render: (v: number) => wan(v) },
                  { title: '月均运行(万)', dataIndex: 'monthlyRunRate', width: 110, render: (v: number) => wan(v) },
                  { title: '年末预测(万)', dataIndex: 'projectedYearEnd', width: 110, render: (v: number) => wan(v) },
                  {
                    title: '预计超支(万)', dataIndex: 'predictedOverrun', width: 110,
                    render: (v: number) => <span style={{ color: v > 0 ? '#d4483e' : '#3f9d63' }}>{wan(v)}</span>,
                  },
                  {
                    title: '风险', dataIndex: 'riskLevel', width: 90,
                    render: (v: string) => <Tag color={RISK_TAG[v].color}>{RISK_TAG[v].text}</Tag>,
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
