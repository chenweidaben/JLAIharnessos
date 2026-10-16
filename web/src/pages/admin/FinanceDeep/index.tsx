/**
 * 健澜科技 jlmedaios - M178-A 医院财务管理深化页（财务人力行政党建，仅 admin）
 *
 * 财务管理要真实，不能账实不符：
 *  - 预算管理：年度预算 vs 月度实际执行，超进度预警（on_track/warning/over/ahead）；
 *  - 成本核算：科室直接/间接成本，下钻项目成本、病种成本，折算单位成本；
 *  - 收入管理：门诊/住院/药品/检查四类收入结构，药占比红线预警；
 *  - 财务分析：本量利 CVP（固定/变动成本、盈亏平衡点、安全边际）+ 趋势外推。
 *
 * 三态：loading / error（可重试）/ empty（demo 或降级空口径）。
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

/* ---------------- 与 BFF financeDeep 输出对齐的类型 ---------------- */

interface BudgetExecutionLine {
  dept: string;
  subject: string;
  subjectLabel: string;
  annualBudget: number;
  actualYtd: number;
  paceBudget: number;
  paceRate: number;
  status: 'on_track' | 'warning' | 'over' | 'ahead';
}

interface DeptCostResult {
  dept: string;
  periodYear: number;
  periodMonth?: number;
  directCost: number;
  indirectCost: number;
  totalCost: number;
  costByCategory: { category: string; label: string; amount: number }[];
  projectCosts: { projectCode: string; directCost: number; indirectCost: number; totalCost: number }[];
  diseaseCosts: { diseaseCode: string; directCost: number; indirectCost: number; totalCost: number }[];
  deptRevenue: number;
  netContribution: number;
  costPerVisit: number | null;
  costPerBedDay: number | null;
  txnCount: number;
}

interface RevenueStructure {
  totalRevenue: number;
  byCategory: { category: string; label: string; amount: number; share: number }[];
  drugRatio: number;
  examRatio: number;
  drugRatioWarning: boolean;
}

interface CvpAnalysis {
  fixedCost: number;
  variableCost: number;
  revenue: number;
  contributionMargin: number;
  cmRatio: number;
  breakEvenRevenue: number;
  safetyMargin: number;
  isLoss: boolean;
}

interface FinancialTrend {
  direction: 'up' | 'down' | 'flat';
  avgMonthlyNet: number;
  slope: number;
  forecastNet: { year: number; month: number; net: number }[];
  note: string;
}

interface FinanceDeepData {
  demo?: boolean;
  degraded?: boolean;
  message?: string;
  rowCount?: number;
  periodYear: number;
  periodMonth?: number;
  budgetExecution: BudgetExecutionLine[];
  overrunAlertCount: number;
  departmentCost: DeptCostResult;
  revenue: RevenueStructure;
  cvp: CvpAnalysis;
  trend: FinancialTrend;
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

const DIR_TAG: Record<string, { color: string; text: string }> = {
  up: { color: 'green', text: '向好' },
  down: { color: 'red', text: '承压' },
  flat: { color: 'default', text: '平稳' },
};

/** 元 → 万元 */
const wan = (v: number) => (v / 10000).toFixed(1);

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function FinanceDeepPage() {
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState<number>(thisYear);
  const [month, setMonth] = useState<number>(thisMonth);
  const [dept, setDept] = useState<string>('');
  const [data, setData] = useState<FinanceDeepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ year: String(year), month: String(month) });
      if (dept.trim()) qs.set('dept', dept.trim());
      const d = await getJson<FinanceDeepData>(`/api/v1/finance/deep?${qs.toString()}`);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '财务数据加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, dept]);

  useEffect(() => { void load(); }, [load]);

  /** 收入结构饼图 */
  const revenuePie = useMemo(() => {
    const cats = data?.revenue?.byCategory ?? [];
    return {
      color: [VI.accent, '#3f9d63', '#f0a04b', '#8aa9c9'],
      tooltip: { trigger: 'item', valueFormatter: (v: number) => `${wan(v)} 万元` },
      legend: { bottom: 0 },
      series: [{
        type: 'pie' as const, radius: ['40%', '68%'],
        data: cats.map((c) => ({ name: c.label, value: c.amount })),
        label: { formatter: '{b}\n{d}%' },
      }],
    };
  }, [data]);

  /** 预算执行 进度基准 vs 实际 柱状图 */
  const budgetBar = useMemo(() => {
    const rows = data?.budgetExecution ?? [];
    return {
      color: [VI.accentSoft, '#d4483e'],
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${wan(v)} 万元` },
      legend: { data: ['进度基准', '实际支出'], bottom: 0 },
      grid: { left: 60, right: 24, top: 24, bottom: 48 },
      xAxis: { type: 'category', data: rows.map((r) => r.subjectLabel), axisLabel: { color: VI.deep } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万` } },
      series: [
        { name: '进度基准', type: 'bar' as const, data: rows.map((r) => r.paceBudget) },
        { name: '实际支出', type: 'bar' as const, data: rows.map((r) => r.actualYtd) },
      ],
    };
  }, [data]);

  /** 科室成本 固定/变动/收入 对比 */
  const costBar = useMemo(() => {
    const cvp = data?.cvp;
    if (!cvp) return {};
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${wan(v)} 万元` },
      grid: { left: 60, right: 24, top: 24, bottom: 40 },
      xAxis: { type: 'category', data: ['业务收入', '变动成本', '固定成本', '盈亏平衡收入'] },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万` } },
      series: [{
        type: 'bar' as const, barWidth: '45%',
        data: [
          { value: cvp.revenue, itemStyle: { color: '#3f9d63' } },
          { value: cvp.variableCost, itemStyle: { color: '#f0a04b' } },
          { value: cvp.fixedCost, itemStyle: { color: '#d4483e' } },
          { value: cvp.breakEvenRevenue, itemStyle: { color: VI.accentSoft } },
        ],
      }],
    };
  }, [data]);

  const cvp = data?.cvp;
  const rev = data?.revenue;
  const dc = data?.departmentCost;
  const trend = data?.trend;
  const isEmpty = !loading && !error && data && (data.demo || data.degraded || !data.rowCount);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院财务管理深化</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          财务人力行政党建 · 预算执行 / 科室成本 / 收入结构 / 本量利分析（账实相符，不拍脑袋）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 查询条件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Typography.Text style={{ color: '#666' }}>会计年度</Typography>
              <Input style={{ marginTop: 8 }} type="number" value={year}
                onChange={(e) => setYear(Number(e.target.value))} />
            </Col>
            <Col span={6}>
              <Typography.Text style={{ color: '#666' }}>会计月份（留空=全年）</Typography>
              <Input style={{ marginTop: 8 }} type="number" min={1} max={12} value={month}
                onChange={(e) => setMonth(Number(e.target.value))} />
            </Col>
            <Col span={6}>
              <Typography.Text style={{ color: '#666' }}>重点科室（可选）</Typography>
              <Input.Search style={{ marginTop: 8 }} value={dept} placeholder="如 internal_medicine"
                onChange={(e) => setDept(e.target.value)} onSearch={load} allowClear />
            </Col>
            <Col span={6}>
              <Button onClick={load} loading={loading} type="primary">查询</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载财务数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && isEmpty && (
          <Alert type="info" showIcon message={data?.message || '当前账期暂无财务流水。'} />
        )}

        {!loading && !error && data && !isEmpty && cvp && rev && dc && trend && (
          <>
            {/* KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="业务收入" value={`${wan(cvp.revenue)} 万元`} valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="总成本（固定+变动）" value={`${wan(cvp.fixedCost + cvp.variableCost)} 万元`}
                    valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="净结余" value={`${wan(cvp.revenue - cvp.fixedCost - cvp.variableCost)} 万元`}
                    valueStyle={{ color: cvp.isLoss ? '#d4483e' : '#3f9d63' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="药占比" value={`${(rev.drugRatio * 100).toFixed(1)}%`}
                    valueStyle={{ color: rev.drugRatioWarning ? '#d4483e' : VI.deep }}
                  />
                  {rev.drugRatioWarning && <Tag color="red" style={{ marginTop: 8 }}>超 30% 红线</Tag>}
                </Card>
              </Col>
            </Row>

            {/* 图 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title="收入结构（门诊/住院/药品/检查）">
                  <ReactECharts option={revenuePie} style={{ height: 280 }} notMerge />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="预算执行：进度基准 vs 实际">
                  <ReactECharts option={budgetBar} style={{ height: 280 }} notMerge />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="本量利 CVP">
                  <ReactECharts option={costBar} style={{ height: 280 }} notMerge />
                </Card>
              </Col>
            </Row>

            {/* 本量利指标 */}
            <Card title="本量利分析（盈亏平衡）" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={5}>
                  <Statistic title="边际贡献率" value={`${(cvp.cmRatio * 100).toFixed(1)}%`} />
                </Col>
                <Col span={5}>
                  <Statistic title="盈亏平衡收入" value={`${wan(cvp.breakEvenRevenue)} 万元`} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="安全边际率" value={`${(cvp.safetyMargin * 100).toFixed(1)}%`}
                    valueStyle={{ color: cvp.safetyMargin < 0.1 ? '#d4483e' : VI.deep }}
                  />
                </Col>
                <Col span={5}>
                  <Statistic title="趋势方向" value={DIR_TAG[trend.direction].text} />
                </Col>
                <Col span={4}>
                  <Statistic title="月均净结余" value={`${wan(trend.avgMonthlyNet)} 万`} />
                </Col>
              </Row>
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>{trend.note}</Paragraph>
            </Card>

            {/* 预算执行明细 */}
            <Card title={`预算月度执行（超支/预警 ${data.overrunAlertCount} 条）`} style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.dept}-${r.subject}`}
                pagination={false} size="small" dataSource={data.budgetExecution}
                columns={[
                  { title: '成本中心', dataIndex: 'dept', width: 160 },
                  { title: '预算科目', dataIndex: 'subjectLabel', width: 120 },
                  { title: '年预算(万)', dataIndex: 'annualBudget', width: 100, render: (v: number) => wan(v) },
                  { title: '进度基准(万)', dataIndex: 'paceBudget', width: 110, render: (v: number) => wan(v) },
                  { title: '实际(万)', dataIndex: 'actualYtd', width: 100, render: (v: number) => wan(v) },
                  { title: '进度执行率', dataIndex: 'paceRate', width: 100, render: (v: number) => `${(v * 100).toFixed(0)}%` },
                  {
                    title: '状态', dataIndex: 'status', width: 90,
                    render: (v: string) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].text}</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 科室成本核算 */}
            <Card title={`科室成本核算 · ${dc.dept}（直接 ${wan(dc.directCost)} 万 / 间接 ${wan(dc.indirectCost)} 万 / 净贡献 ${wan(dc.netContribution)} 万）`}>
              <Row gutter={16}>
                <Col span={12}>
                  <Typography.Text strong>成本类别构成</Typography.Text>
                  <Table
                    rowKey="category" pagination={false} size="small"
                    dataSource={dc.costByCategory}
                    columns={[
                      { title: '类别', dataIndex: 'label' },
                      { title: '金额(万)', dataIndex: 'amount', width: 110, render: (v: number) => wan(v) },
                    ]}
                  />
                </Col>
                <Col span={12}>
                  <Typography.Text strong>项目成本下钻（Top）</Typography.Text>
                  <Table
                    rowKey="projectCode" pagination={false} size="small"
                    dataSource={dc.projectCosts.slice(0, 6)}
                    columns={[
                      { title: '项目', dataIndex: 'projectCode' },
                      { title: '直接(万)', dataIndex: 'directCost', width: 90, render: (v: number) => wan(v) },
                      { title: '间接(万)', dataIndex: 'indirectCost', width: 90, render: (v: number) => wan(v) },
                      { title: '合计(万)', dataIndex: 'totalCost', width: 90, render: (v: number) => wan(v) },
                    ]}
                  />
                </Col>
              </Row>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
