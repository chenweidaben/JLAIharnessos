/**
 * 健澜科技 jlmedaios - M166-A 【绩效与人才】医院科室绩效考核深化页（仅 admin）
 *
 * 绩效考核要公平，不能只看工作量：
 *  - 五维十三项加权百分制：医疗质量30% / 运营效率20% / 患者满意20% / 教学科研15% / 成本控制15%；
 *  - 门诊量/手术量只占效率维度一格，权重合计仅 20%；
 *  - 全院对标：本科室 vs 全院平均 vs 前四分位，百分位排名；
 *  - 差距识别：低于目标的指标按缺口排序，输出改进优先级，对接人才培养。
 *
 * 三态：loading / error（可重试）/ empty。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Progress, Row, Select, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF performanceDeep 输出对齐的类型 ---------------- */

type DimensionCode = 'quality' | 'efficiency' | 'satisfaction' | 'teaching_research' | 'cost_control';

interface ScoredMetric {
  code: string;
  name: string;
  value: number;
  target: number;
  direction: 'higher_is_better' | 'lower_is_better';
  unit: string;
  sampleSize: number;
  score: number;
  underpowered: boolean;
}

interface DimensionScore {
  code: DimensionCode;
  label: string;
  weight: number;
  score: number;
  metrics: ScoredMetric[];
}

interface PerformanceScore {
  dept: string;
  deptName: string;
  period: string;
  totalScore: number;
  dimensions: DimensionScore[];
  grade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  hasUnderpowered: boolean;
}

interface DimensionVsAverage {
  code: DimensionCode;
  label: string;
  self: number;
  average: number;
  delta: number;
}

interface BenchmarkResult {
  dept: string;
  period: string;
  selfScore: number;
  hospitalAverage: number;
  topQuartile: number;
  percentile: number;
  deptCount: number;
  dimensionVsAverage: DimensionVsAverage[];
}

interface PerformanceGap {
  dimension: DimensionCode;
  dimensionLabel: string;
  metricCode: string;
  metricName: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface PerformanceKpiData {
  dept: string;
  period: string;
  dataSource: 'database' | 'demo';
  score: PerformanceScore;
  benchmark: BenchmarkResult;
  gaps: PerformanceGap[];
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const GRADE_TAG: Record<string, { color: string; text: string }> = {
  excellent: { color: 'green', text: '优秀 ≥90' },
  good: { color: 'blue', text: '良好 ≥80' },
  fair: { color: 'orange', text: '合格 ≥70' },
  needs_improvement: { color: 'red', text: '待改进 <70' },
};

const PRIORITY_TAG: Record<string, { color: string; text: string }> = {
  high: { color: 'red', text: '高优先级' },
  medium: { color: 'orange', text: '中优先级' },
  low: { color: 'default', text: '低优先级' },
};

const DEPT_OPTIONS = [
  { value: 'internal_medicine', label: '内科 internal_medicine' },
  { value: 'surgery', label: '外科 surgery' },
  { value: 'pediatrics', label: '儿科 pediatrics' },
  { value: 'obstetrics_gynecology', label: '妇产科 obstetrics_gynecology' },
  { value: 'cardiology', label: '心内科 cardiology' },
  { value: 'neurology', label: '神经内科 neurology' },
  { value: 'orthopedics', label: '骨科 orthopedics' },
  { value: 'emergency', label: '急诊科 emergency' },
  { value: 'icu', label: '重症医学科 icu' },
  { value: 'oncology', label: '肿瘤科 oncology' },
];

function periodOptions(): { value: string; label: string }[] {
  const now = new Date().getFullYear();
  const out: { value: string; label: string }[] = [];
  for (let y = now; y >= now - 1; y--) {
    for (let q = 4; q >= 1; q--) {
      out.push({ value: `${y}Q${q}`, label: `${y}年 第${q}季度` });
    }
  }
  return out;
}

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function PerformanceDeepPage() {
  const thisPeriod = (() => {
    const now = new Date();
    return `${now.getFullYear()}Q${Math.floor(now.getMonth() / 3) + 1}`;
  })();

  const [dept, setDept] = useState<string>('internal_medicine');
  const [period, setPeriod] = useState<string>(thisPeriod);
  const [data, setData] = useState<PerformanceKpiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!dept) { setError('请选择科室'); return; }
    setLoading(true);
    setError('');
    try {
      const d = await getJson<PerformanceKpiData>(
        `/api/v1/admin/performance/kpi?dept=${encodeURIComponent(dept)}&period=${encodeURIComponent(period)}`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '绩效数据加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dept, period]);

  useEffect(() => { void load(); }, [load]);

  /** 五维雷达图：本科室维度分 vs 全院平均 vs 前四分位 */
  const radarOption = useMemo(() => {
    const dims = data?.score.dimensions ?? [];
    const avg = data?.benchmark.dimensionVsAverage ?? [];
    const indicator = dims.map((d) => ({ name: d.label, max: 120 }));
    const selfData = dims.map((d) => d.score);
    const avgData = avg.map((a) => a.average);
    return {
      color: [VI.accent, '#f0a04b', '#d4483e'],
      tooltip: {},
      legend: { data: ['本科室', '全院平均', '前四分位线'], bottom: 0 },
      radar: {
        indicator,
        axisName: { color: VI.deep },
        splitArea: { areaStyle: { color: ['#fff', '#f0f4f9'] } },
      },
      series: [{
        type: 'radar' as const,
        data: [
          { value: selfData, name: '本科室' },
          { value: avgData, name: '全院平均' },
          {
            value: dims.map(() => data?.benchmark.topQuartile ?? 100),
            name: '前四分位线',
            areaStyle: { opacity: 0.05 },
          },
        ],
      }],
    };
  }, [data]);

  /** 维度权重条形图（强调工作量只占 20%） */
  const weightOption = useMemo(() => {
    const dims = data?.score.dimensions ?? [];
    return {
      tooltip: { trigger: 'axis', formatter: (p: { name: string; value: number }[]) => `${p[0].name}：权重 ${(p[0].value * 100).toFixed(0)}%` },
      grid: { left: 90, right: 30, top: 16, bottom: 24 },
      xAxis: { type: 'value', max: 0.35, axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
      yAxis: { type: 'category', data: dims.map((d) => d.label), axisLabel: { color: VI.deep } },
      series: [{
        type: 'bar' as const,
        data: dims.map((d) => ({
          value: d.weight,
          itemStyle: { color: d.code === 'efficiency' ? '#f0a04b' : VI.accent },
        })),
        label: { show: true, formatter: (p: { value: number }) => `${(p.value * 100).toFixed(0)}%` },
      }],
    };
  }, [data]);

  /** 差距表列 */
  const gapColumns: ColumnsType<PerformanceGap> = [
    { title: '维度', dataIndex: 'dimensionLabel', width: 100 },
    { title: '指标', dataIndex: 'metricName', width: 140 },
    {
      title: '当前得分', dataIndex: 'currentScore', width: 100,
      render: (v: number) => <Text strong>{v.toFixed(1)}</Text>,
    },
    {
      title: '缺口', dataIndex: 'gap', width: 90,
      render: (v: number) => <Text type="danger">-{v.toFixed(1)}</Text>,
    },
    {
      title: '优先级', dataIndex: 'priority', width: 100,
      render: (v: string) => {
        const t = PRIORITY_TAG[v] ?? PRIORITY_TAG.low;
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    { title: '改进建议', dataIndex: 'suggestion' },
  ];

  const score = data?.score;
  const bench = data?.benchmark;
  const grade = score ? GRADE_TAG[score.grade] : undefined;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院科室绩效考核</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          绩效与人才 · 五维十三项加权百分制（质量30/效率20/满意20/教研15/成本15）—— 公平考核，不只看工作量
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 查询条件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text style={{ color: '#666' }}>科室</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={dept}
                onChange={setDept}
                options={DEPT_OPTIONS}
              />
            </Col>
            <Col span={8}>
              <Text style={{ color: '#666' }}>考核周期</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={period}
                onChange={setPeriod}
                options={periodOptions()}
              />
            </Col>
            <Col span={4}>
              <Button type="primary" style={{ marginTop: 30 }} loading={loading} onClick={load}>
                查询
              </Button>
            </Col>
            {data?.dataSource === 'demo' && (
              <Col span={4}>
                <Alert style={{ marginTop: 22 }} type="info" showIcon message="演示数据" />
              </Col>
            )}
          </Row>
        </Card>

        {error && <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />}

        <Spin spinning={loading}>
          {data && score && (
            <>
              {/* 总分与对标概览 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic title="绩效总分" value={score.totalScore} precision={1} suffix="/120" />
                    {grade && <Tag color={grade.color} style={{ marginTop: 8 }}>{grade.text}</Tag>}
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic title="全院平均" value={bench?.hospitalAverage ?? 0} precision={1} />
                    <Progress percent={Math.round(((bench?.selfScore ?? 0) / Math.max(bench?.hospitalAverage ?? 1, 1)) * 100 - 100) / 1} size="small" showInfo={false} strokeColor={VI.accent} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic title="百分位排名" value={bench?.percentile ?? 0} precision={0} suffix="%" />
                    <Text type="secondary">优于 {bench?.deptCount ?? 0} 个科室中的多数</Text>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic title="前四分位线" value={bench?.topQuartile ?? 0} precision={1} />
                    <Text type="secondary">进入全院 Top 25% 的门槛</Text>
                  </Card>
                </Col>
              </Row>

              {score.hasUnderpowered && (
                <Alert
                  style={{ marginBottom: 16 }}
                  type="warning"
                  showIcon
                  message="部分指标样本量不足（underpowered），结论仅供参考，不宜仅凭本期小样本定全年绩效。"
                />
              )}

              {/* 雷达图 + 权重图 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={14}>
                  <Card title="五维绩效雷达（本科室 vs 全院对标）">
                    <ReactECharts option={radarOption} style={{ height: 360 }} />
                  </Card>
                </Col>
                <Col span={10}>
                  <Card title="考核权重分布（工作量仅占 20%）">
                    <ReactECharts option={weightOption} style={{ height: 360 }} />
                    <Paragraph style={{ marginTop: 8, color: '#888' }}>
                      橙色「运营效率」含门诊量/手术量，权重仅 20%；质量与满意合计 50%，杜绝以量论英雄。
                    </Paragraph>
                  </Card>
                </Col>
              </Row>

              {/* 差距识别 */}
              <Card title={`差距识别与改进优先级（${data.gaps.length} 项待提升）`} style={{ marginBottom: 16 }}>
                <Table
                  rowKey={(r) => r.metricCode}
                  columns={gapColumns}
                  dataSource={data.gaps}
                  pagination={false}
                  size="small"
                />
              </Card>

              <Paragraph style={{ color: '#aaa', textAlign: 'center' }}>
                生成时间：{new Date(data.generatedAt).toLocaleString()} · 杭州健澜科技有限公司 · 绩效与人才
              </Paragraph>
            </>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
