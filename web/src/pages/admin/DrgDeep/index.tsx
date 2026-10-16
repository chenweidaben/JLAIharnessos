/**
 * 健澜科技 jlmedaios - M176-A 【临床核心深化】DRG/DIP 付费深度分析页（仅 admin）
 *
 * DRG 分析要真懂医保政策，不能外行：
 *  - 分组正确性：主诊断 ICD 前缀 + 是否手术室操作（ORP）反推应入组，错配立现；
 *  - 费用偏差 / 盈亏：标准付费 = 权重 × 费率，结余留用、超支自担；
 *  - 病种结构：CMI、时间消耗指数、费用消耗指数；
 *  - 离群病例：高费用（特例单议）/ 超长住院 / 低费用短住院（低标入院嫌疑）。
 *
 * 三态：loading / error（可重试）/ empty（暂无病例）。视觉：深海蓝 VI。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF drgDeep 输出对齐的类型 ---------------- */

interface GroupCheck {
  visitId: string;
  actualGroup: string;
  expectedGroup: string;
  correctness: 'correct' | 'suspect' | 'wrong';
  reasons: string[];
}
interface ProfitLoss {
  visitId: string;
  groupCode: string;
  standardPayment: number;
  actualCost: number;
  profitLoss: number;
  deviationRate: number;
  verdict: 'profit' | 'loss' | 'balanced';
}
interface Outlier {
  groupCode: string;
  cost: number;
  los: number;
  status: 'inlier' | 'high_cost_outlier' | 'long_los_outlier' | 'low_cost_outlier';
  action: string;
  reason: string;
}
interface Recommendation {
  dimension: string;
  severity: 'info' | 'warning' | 'critical';
  finding: string;
  action: string;
  expectedEffect: string;
}
interface DrgDeepData {
  dept: string;
  period: string;
  demo: boolean;
  hasData?: boolean;
  message?: string;
  groupChecks?: GroupCheck[];
  groupingSummary?: { total: number; correct: number; suspect: number; wrong: number; wrongRate: number };
  profitLosses?: ProfitLoss[];
  deptProfitLoss?: number;
  profitCaseCount?: number;
  lossCaseCount?: number;
  diseaseStructure?: {
    caseCount: number;
    cmi: number;
    timeEfficiencyIndex: number;
    costEfficiencyIndex: number;
  };
  outliers?: Outlier[];
  optimization?: { dept: string; period: string; recommendations: Recommendation[] };
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

const CORRECT_TAG: Record<GroupCheck['correctness'], { color: string; text: string }> = {
  correct: { color: 'green', text: '正确' },
  suspect: { color: 'orange', text: '待复核' },
  wrong: { color: 'red', text: '错误' },
};

const OUTLIER_TAG: Record<Outlier['status'], { color: string; text: string }> = {
  inlier: { color: 'default', text: '正常带内' },
  high_cost_outlier: { color: 'red', text: '高费用离群' },
  long_los_outlier: { color: 'orange', text: '超长住院' },
  low_cost_outlier: { color: 'volcano', text: '低费用短住院' },
};

const SEVERITY_TAG: Record<Recommendation['severity'], { color: string; text: string }> = {
  info: { color: 'blue', text: '提示' },
  warning: { color: 'orange', text: '预警' },
  critical: { color: 'red', text: '严重' },
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function DrgDeepPage() {
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [dept, setDept] = useState<string>('呼吸内科');
  const [period, setPeriod] = useState<string>(thisMonth);
  const [data, setData] = useState<DrgDeepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!dept.trim()) { setError('请输入科室名称'); return; }
    setLoading(true);
    setError('');
    try {
      const d = await getJson<DrgDeepData>(
        `/api/v1/admin/drg/deep-analysis?dept=${encodeURIComponent(dept.trim())}&period=${encodeURIComponent(period)}`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DRG 深度分析加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dept, period]);

  useEffect(() => { void load(); }, [load]);

  /** 单病例盈亏柱状图 */
  const profitChartOption = useMemo(() => {
    const list = data?.profitLosses ?? [];
    return {
      tooltip: { trigger: 'axis' as const, formatter: (ps: Array<{ data: number; name: string }>) => '' },
      grid: { left: 60, right: 20, top: 30, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: list.map((p) => p.visitId.replace('v-demo-', '')),
        axisLabel: { color: VI.deep },
      },
      yAxis: { type: 'value' as const, name: '元', axisLabel: { color: VI.deep } },
      series: [{
        type: 'bar' as const,
        data: list.map((p) => ({
          value: p.profitLoss,
          itemStyle: { color: p.profitLoss >= 0 ? '#3f9c6f' : '#d95548' },
        })),
        barMaxWidth: 36,
      }],
    };
  }, [data]);

  /** 消耗指数对比柱（标杆=1） */
  const efficiencyOption = useMemo(() => {
    const ds = data?.diseaseStructure;
    return {
      tooltip: {},
      grid: { left: 60, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category' as const, data: ['时间消耗指数', '费用消耗指数'], axisLabel: { color: VI.deep } },
      yAxis: { type: 'value' as const, axisLabel: { color: VI.deep } },
      series: [{
        type: 'bar' as const,
        data: [
          { value: ds?.timeEfficiencyIndex ?? 0, itemStyle: { color: (ds?.timeEfficiencyIndex ?? 0) > 1.2 ? '#d95548' : VI.accent } },
          { value: ds?.costEfficiencyIndex ?? 0, itemStyle: { color: (ds?.costEfficiencyIndex ?? 0) > 1.2 ? '#d95548' : VI.accent } },
        ],
        barMaxWidth: 60,
        markLine: { data: [{ yAxis: 1, name: '标杆' }] },
      }],
    };
  }, [data]);

  const ds = data?.diseaseStructure;
  const gs = data?.groupingSummary;
  const outliers = data?.outliers ?? [];
  const recs = data?.optimization?.recommendations ?? [];

  const groupColumns: ColumnsType<GroupCheck> = [
    { title: '就诊', dataIndex: 'visitId', width: 140 },
    { title: '实际入组', dataIndex: 'actualGroup', width: 110 },
    { title: '应入组', dataIndex: 'expectedGroup', width: 110 },
    {
      title: '判定', dataIndex: 'correctness', width: 100,
      render: (v: GroupCheck['correctness']) => <Tag color={CORRECT_TAG[v].color}>{CORRECT_TAG[v].text}</Tag>,
    },
    { title: '疑点说明', dataIndex: 'reasons', render: (r: string[]) => r.join('；') || '—' },
  ];

  const plColumns: ColumnsType<ProfitLoss> = [
    { title: '就诊', dataIndex: 'visitId', width: 140 },
    { title: '病组', dataIndex: 'groupCode', width: 100 },
    { title: '标准付费(元)', dataIndex: 'standardPayment', width: 120 },
    { title: '实际费用(元)', dataIndex: 'actualCost', width: 120 },
    {
      title: '盈亏(元)', dataIndex: 'profitLoss', width: 120,
      render: (v: number) => <Text type={v >= 0 ? 'success' : 'danger'}>{v >= 0 ? `+${v}` : v}</Text>,
    },
    {
      title: '偏差率', dataIndex: 'deviationRate', width: 100,
      render: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>DRG/DIP 付费深度分析</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          临床核心深化 · 分组正确性反查 / 费用偏差 / 病例·科室盈亏 / CMI 与消耗指数 / 离群病例识别
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 查询条件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text style={{ color: '#666' }}>科室</Text>
              <Input.Search
                style={{ marginTop: 8 }}
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                enterButton="查询"
                onSearch={load}
                placeholder="如 呼吸内科 / 心内科"
              />
            </Col>
            <Col span={6}>
              <Text style={{ color: '#666' }}>统计周期（如 2026-09）</Text>
              <Input style={{ marginTop: 8 }} value={period} onChange={(e) => setPeriod(e.target.value)} />
            </Col>
            <Col span={6}>
              <Button onClick={load} loading={loading}>刷新</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载 DRG 深度分析中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && data && !data.hasData && (
          <Alert type="info" showIcon message={data.message || '暂无数据'} />
        )}

        {!loading && data?.hasData && (
          <>
            {data.demo && <Alert type="warning" showIcon message={data.message} style={{ marginBottom: 16 }} />}

            {/* KPI 卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="出院病例" value={ds?.caseCount ?? 0} suffix="例" /></Card></Col>
              <Col span={4}><Card><Statistic title="CMI" value={ds?.cmi ?? 0} precision={2} /></Card></Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="科室 DRG 净盈亏"
                    value={data.deptProfitLoss ?? 0}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: (data.deptProfitLoss ?? 0) >= 0 ? '#3f9c6f' : '#d95548' }}
                  />
                </Card>
              </Col>
              <Col span={5}><Card><Statistic title="结余病例 / 超支病例" value={`${data.profitCaseCount ?? 0} / ${data.lossCaseCount ?? 0}`} /></Card></Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="分组错误率"
                    value={(gs?.wrongRate ?? 0) * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: (gs?.wrongRate ?? 0) > 0.05 ? '#d95548' : '#3f9c6f' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="单病例盈亏（元）" size="small">
                  <ReactECharts option={profitChartOption} style={{ height: 260 }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="消耗指数（标杆=1）" size="small">
                  <ReactECharts option={efficiencyOption} style={{ height: 260 }} />
                </Card>
              </Col>
            </Row>

            <Card title="分组正确性反查" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="visitId"
                size="small"
                columns={groupColumns}
                dataSource={data.groupChecks ?? []}
                pagination={{ pageSize: 8 }}
              />
            </Card>

            <Card title="病例盈亏明细" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="visitId"
                size="small"
                columns={plColumns}
                dataSource={data.profitLosses ?? []}
                pagination={{ pageSize: 8 }}
              />
            </Card>

            {outliers.length > 0 && (
              <Card title={`离群病例（${outliers.length} 例）`} size="small" style={{ marginBottom: 16 }}>
                {outliers.map((o) => (
                  <div key={`${o.groupCode}-${o.cost}`} style={{ marginBottom: 8 }}>
                    <Tag color={OUTLIER_TAG[o.status].color}>{OUTLIER_TAG[o.status].text}</Tag>
                    <Text style={{ marginLeft: 8 }}>{o.reason}</Text>
                    {o.action && <Tag color="blue" style={{ marginLeft: 8 }}>建议：{o.action}</Tag>}
                  </div>
                ))}
              </Card>
            )}

            <Card title="DRG 绩效优化建议" size="small">
              {recs.map((r, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Tag color={SEVERITY_TAG[r.severity].color}>{SEVERITY_TAG[r.severity].text}</Tag>
                  <Text strong style={{ marginLeft: 8 }}>{r.finding}</Text>
                  <div style={{ marginLeft: 56, marginTop: 4 }}>
                    <Text type="secondary">动作：{r.action}</Text>
                    <br />
                    <Text type="secondary">预期效果：{r.expectedEffect}</Text>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
