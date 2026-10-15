/**
 * 健澜科技 jlmedaios - 科室学习曲线页面（M119-B）
 *
 * 依据宪法第七章「Doctor MUSE」：
 *   7.2 科室层：跨员工个人智能体经验按月汇聚，形成组织级学习曲线；
 *   7.7 经验记录铁律：失败经验单独成桶，「成功率爬升 + 教训收敛」
 *     是学习生效的双指标证据；
 *   7.8 后继者机制：最佳实践数即新员工入职自动加载的科室基线规模。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Row,
  Segmented,
  Spin,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const GREEN = '#52c41a';

/** 可切换科室（演示期固定三家；接入后由字典表下发） */
const DEPT_OPTIONS = ['DEP-CARD', 'DEP-RESP', 'DEP-SURG'] as const;

/* ------------------------- 与 BFF 响应 data 对齐 ------------------------- */

interface MonthlyGrowthPoint {
  month: string;
  count: number;
  momGrowthPct: number | null;
}
interface SuccessTrendPoint {
  month: string;
  successRate: number;
  sampleSize: number;
}
interface LessonTrendPoint {
  month: string;
  lessons: number;
}
interface DeptLearningCurveView {
  deptCode: string;
  window: { from: string; to: string; months: number };
  monthlyGrowth: MonthlyGrowthPoint[];
  successTrend: SuccessTrendPoint[];
  lessonReduction: { monthly: LessonTrendPoint[]; reductionPct: number };
  bestPracticeCount: number;
}
interface DeptCurveComparisonRow {
  deptCode: string;
  totalDecisions: number;
  avgSuccessRate: number;
  reductionPct: number;
  bestPracticeCount: number;
  curve: DeptLearningCurveView;
}
interface DeptCurveData {
  demo: boolean;
  deptCode: string;
  months: number;
  curve: DeptLearningCurveView;
  comparison: DeptCurveComparisonRow[];
  deptNames: Record<string, string>;
}

/** 单张统计卡 */
function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
}) {
  return (
    <Card
      style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }}
      bodyStyle={{ padding: 20 }}
    >
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Title level={3} style={{ color: DEEP_BG, margin: 0 }}>
          {value}
          {suffix && (
            <Text style={{ fontSize: 13, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>
              {suffix}
            </Text>
          )}
        </Title>
      </div>
    </Card>
  );
}

export default function DeptCurvePage() {
  const [dept, setDept] = useState<string>('DEP-CARD');
  const [data, setData] = useState<DeptCurveData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  /** 对比科室 = 其余两家（演示期三家固定；非演示期可由 ?compare= 扩展） */
  const compareList = useMemo(
    () => DEPT_OPTIONS.filter((d) => d !== dept).join(','),
    [dept],
  );

  const load = useCallback(
    async (target: string) => {
      setLoading(true);
      setError('');
      try {
        const res = await get<DeptCurveData>(
          `/muse/dept-curve/${target}`,
          { months: 6, compare: compareList },
          { silent: true },
        );
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : '科室学习曲线加载失败');
      } finally {
        setLoading(false);
      }
    },
    [compareList],
  );

  useEffect(() => {
    void load(dept);
  }, [load, dept]);

  const curve = data?.curve;
  const comparison = useMemo(() => data?.comparison ?? [], [data]);
  const totalAll = comparison.reduce((s, r) => s + r.totalDecisions, 0);
  const isEmpty = !loading && !error && totalAll === 0;

  const deptNameOf = useCallback(
    (code: string) => data?.deptNames?.[code] ?? code,
    [data],
  );

  /* 学习曲线：成功率折线（主轴）+ 教训柱（次轴，7.7 单独成桶） */
  const learningOption = useMemo(() => {
    const months = (curve?.successTrend ?? []).map((p) => p.month);
    const success = (curve?.successTrend ?? []).map((p) => +(p.successRate * 100).toFixed(1));
    const lessons = (curve?.lessonReduction?.monthly ?? []).map((p) => p.lessons);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: 'rgba(255,255,255,0.75)' }, top: 0 },
      grid: { left: 48, right: 48, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        axisLabel: { color: 'rgba(255,255,255,0.75)' },
      },
      yAxis: [
        {
          type: 'value',
          name: '成功率%',
          min: 0,
          max: 100,
          nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
          axisLabel: { color: 'rgba(255,255,255,0.65)' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        },
        {
          type: 'value',
          name: '教训数',
          min: 0,
          nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
          axisLabel: { color: 'rgba(255,255,255,0.65)' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '成功率',
          type: 'line',
          smooth: true,
          data: success,
          symbolSize: 8,
          lineStyle: { width: 3, color: ACCENT },
          itemStyle: { color: ACCENT },
        },
        {
          name: '教训数',
          type: 'bar',
          yAxisIndex: 1,
          data: lessons,
          barWidth: 16,
          itemStyle: { color: 'rgba(250,173,20,0.75)', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [curve]);

  /* 科室对比柱状图：平均成功率% + 最佳实践数（双轴） */
  const compareOption = useMemo(() => {
    const names = comparison.map((r) => deptNameOf(r.deptCode));
    const rates = comparison.map((r) => +(r.avgSuccessRate * 100).toFixed(1));
    const best = comparison.map((r) => r.bestPracticeCount);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: 'rgba(255,255,255,0.75)' }, top: 0 },
      grid: { left: 48, right: 48, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        axisLabel: { color: 'rgba(255,255,255,0.75)' },
      },
      yAxis: [
        {
          type: 'value',
          name: '成功率%',
          min: 0,
          max: 100,
          nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
          axisLabel: { color: 'rgba(255,255,255,0.65)' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        },
        {
          type: 'value',
          name: '最佳实践数',
          minInterval: 1,
          nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
          axisLabel: { color: 'rgba(255,255,255,0.65)' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '平均成功率',
          type: 'bar',
          data: rates,
          barWidth: 28,
          itemStyle: { color: ACCENT, borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: 'rgba(255,255,255,0.85)', fontSize: 11 },
        },
        {
          name: '最佳实践数',
          type: 'bar',
          yAxisIndex: 1,
          data: best,
          barWidth: 28,
          itemStyle: { color: MID_BLUE, borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: 'rgba(255,255,255,0.85)', fontSize: 11 },
        },
      ],
    };
  }, [comparison, deptNameOf]);

  const latestTrend = curve?.successTrend?.[curve.successTrend.length - 1];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          科室学习曲线 · MUSE
        </Title>
        <div>
          {data?.demo && (
            <Badge
              count="演示数据"
              style={{ background: '#faad14', marginRight: 12 }}
              overflowCount={99}
            />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load(dept)}>
            刷新
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load(dept)}>
                重试
              </Button>
            }
          />
        )}

        {/* 科室切换 */}
        <div style={{ marginBottom: 16 }}>
          <Segmented
            value={dept}
            onChange={(v) => setDept(String(v))}
            options={DEPT_OPTIONS.map((d) => ({
              label: data?.deptNames?.[d] ?? d,
              value: d,
            }))}
          />
        </div>

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="正在绘制科室学习曲线…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无决策沉淀：科室开始沉淀「场景 → 决策 → 结局」经验后，这里会自动绘出学习曲线" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 概览统计卡 */}
            <Col xs={12} lg={6}>
              <StatCard
                label={`${deptNameOf(dept)} · 最近月成功率`}
                value={`${((latestTrend?.successRate ?? 0) * 100).toFixed(0)}`}
                suffix="%"
                accent={ACCENT}
              />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="教训降幅"
                value={`${curve?.lessonReduction?.reductionPct ?? 0}`}
                suffix="%"
                accent={Number(curve?.lessonReduction?.reductionPct ?? 0) >= 0 ? GREEN : '#faad14'}
              />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="最佳实践数"
                value={String(curve?.bestPracticeCount ?? 0)}
                suffix="条"
                accent={MID_BLUE}
              />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="时间窗"
                value={`${curve?.window?.months ?? 6}`}
                suffix={`个月 · ${curve?.window?.from ?? ''}~${curve?.window?.to ?? ''}`}
                accent={DEEP_BG}
              />
            </Col>

            {/* 学习曲线：成功率折线 + 教训柱 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>学习曲线 · 成功率爬升与教训收敛</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={learningOption} style={{ height: 340 }} />
              </Card>
            </Col>

            {/* 科室对比柱状图 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>科室对比 · 平均成功率 vs 最佳实践数</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={compareOption} style={{ height: 340 }} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
