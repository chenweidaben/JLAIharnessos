/**
 * 健澜科技 jlmedaios - M127-D 医院运营趋势分析页（管理驾驶舱，仅 admin）
 *
 * 展示 BFF /api/v1/admin/trends/analysis 聚合结果：
 *   - 门诊/住院量趋势折线 + 下月门诊量预测区间（虚线为预测、阴影为区间）；
 *   - 疾病谱占比与较上周期变化；
 *   - 患者来源结构占比。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无运营数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 预测一律标注「基于历史数据估算」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF buildHospitalTrendAnalysis 输出对齐 */
interface VolumeTrend {
  months: string[];
  outpatient: number[];
  inpatient: number[];
  latestMomGrowthPct: number | null;
  avgMonthlyGrowthPct: number;
  direction: 'up' | 'down' | 'flat';
}
interface DiseaseSpectrumItem {
  name: string;
  count: number;
  sharePct: number;
  changePct: number | null;
}
interface PatientSourceItem {
  name: string;
  count: number;
  sharePct: number;
}
interface VolumePrediction {
  nextMonth: string | null;
  predictedOutpatient: number;
  lowerBound: number;
  upperBound: number;
  monthlySlope: number;
  note: string;
}
interface TrendAnalysis {
  timeRange: string;
  volumeTrend: VolumeTrend;
  diseaseSpectrum: DiseaseSpectrumItem[];
  patientSources: PatientSourceItem[];
  prediction: VolumePrediction;
}
interface TrendsResponse {
  analysis: TrendAnalysis;
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const DIRECTION_META: Record<VolumeTrend['direction'], { color: string; text: string }> = {
  up: { color: 'green', text: '上升通道' },
  down: { color: 'red', text: '下滑通道' },
  flat: { color: 'default', text: '平稳' },
};

export default function TrendsPage() {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/trends/analysis');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as TrendsResponse);
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

  const a = data?.analysis;
  const isEmpty =
    !a || a.volumeTrend.months.length === 0;

  /** 折线图 option：历史门诊量实线 + 下月预测虚线 + 预测区间阴影 */
  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!a || isEmpty) return null;
    const { months, outpatient, inpatient } = a.volumeTrend;
    const p = a.prediction;
    // 末位之后追加预测月
    const categories = [...months];
    const outSeries = [...outpatient];
    const inSeries = [...inpatient];
    if (p.nextMonth) {
      categories.push(p.nextMonth);
      outSeries.push(null as unknown as number);
      inSeries.push(null as unknown as number);
    }
    const lastIdx = months.length - 1;
    // 预测虚线：从末值连到预测值
    const forecastLine = categories.map((_, i) =>
      i < lastIdx ? (null as unknown as number) : i === lastIdx ? outpatient[lastIdx] : p.predictedOutpatient,
    );
    // 预测区间：上下两条虚线（从末值到上下界）
    const lowerLine = categories.map((_, i) =>
      i < lastIdx ? (null as unknown as number) : i === lastIdx ? outpatient[lastIdx] : p.lowerBound,
    );
    const upperLine = categories.map((_, i) =>
      i < lastIdx ? (null as unknown as number) : i === lastIdx ? outpatient[lastIdx] : p.upperBound,
    );

    return {
      color: [VI.accent, '#7fb3e0'],
      tooltip: { trigger: 'axis' },
      legend: { data: ['门诊量', '住院量', '下月预测', '预测区间'] },
      grid: { left: 48, right: 24, top: 32, bottom: 32 },
      xAxis: { type: 'category', boundaryGap: false, data: categories },
      yAxis: { type: 'value', name: '人次' },
      series: [
        {
          name: '门诊量',
          type: 'line',
          smooth: true,
          data: outSeries,
          connectNulls: false,
        },
        {
          name: '住院量',
          type: 'line',
          smooth: true,
          data: inSeries,
          connectNulls: false,
        },
        {
          name: '预测区间',
          type: 'line',
          data: lowerLine,
          lineStyle: { opacity: 0 },
          stack: 'band',
          symbol: 'none',
          tooltip: { show: false },
        },
        {
          name: '预测区间',
          type: 'line',
          data: upperLine.map((v, i) =>
            i < lastIdx + 1 ? (null as unknown as number) : (v as number) - (lowerLine[i] as number),
          ),
          lineStyle: { opacity: 0 },
          stack: 'band',
          areaStyle: { color: 'rgba(30,111,191,0.18)' },
          symbol: 'none',
          tooltip: { show: false },
        },
        {
          name: '下月预测',
          type: 'line',
          data: forecastLine,
          lineStyle: { type: 'dashed', color: '#e8801a' },
          itemStyle: { color: '#e8801a' },
          symbol: 'circle',
          symbolSize: 8,
        },
      ],
    };
  }, [a, isEmpty]);

  const directionMeta = a ? DIRECTION_META[a.volumeTrend.direction] : DIRECTION_META.flat;

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
          医院运营趋势分析
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 预测基于历史数据估算
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总运营趋势数据…" />
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

        {/* empty 态 */}
        {!loading && !error && isEmpty && (
          <Alert
            type="info"
            showIcon
            message="暂无运营趋势数据。接入医院运营数据后将自动汇总门诊量趋势、疾病谱与患者来源。"
          />
        )}

        {!loading && !error && a && !isEmpty && (
          <>
            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均月增速"
                    value={a.volumeTrend.avgMonthlyGrowthPct}
                    suffix="%"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="趋势方向" valueRender={() => (
                    <Tag color={directionMeta.color} style={{ fontSize: 16 }}>
                      {directionMeta.text}
                    </Tag>
                  )} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={`下月预测门诊量（${a.prediction.nextMonth ?? '—'}）`}
                    value={a.prediction.predictedOutpatient}
                    suffix="人次"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="预测区间"
                    value={`${a.prediction.lowerBound} ~ ${a.prediction.upperBound}`}
                  />
                </Card>
              </Col>
            </Row>

            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`预测口径：${a.prediction.note}，月均增量约 ${a.prediction.monthlySlope} 人次/月，仅供运营参考。`}
            />

            {/* 门诊/住院量趋势折线 + 预测区间 */}
            <Card title={`门诊量与住院量趋势（${a.timeRange}）`} style={{ marginBottom: 16 }}>
              {chartOption && <ReactECharts option={chartOption} style={{ height: 360 }} />}
            </Card>

            {/* 疾病谱 */}
            <Card title="疾病谱变化（按例数降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="name"
                pagination={false}
                dataSource={a.diseaseSpectrum}
                locale={{ emptyText: '暂无病种数据' }}
                columns={[
                  { title: '病种', dataIndex: 'name' },
                  { title: '例数', dataIndex: 'count', width: 100 },
                  {
                    title: '占比',
                    dataIndex: 'sharePct',
                    width: 100,
                    render: (v: number) => `${v}%`,
                  },
                  {
                    title: '较上周期',
                    dataIndex: 'changePct',
                    width: 130,
                    render: (v: number | null) =>
                      v === null ? (
                        <Tag color="default">暂无对比</Tag>
                      ) : v >= 0 ? (
                        <Tag color="green">+{v}%</Tag>
                      ) : (
                        <Tag color="red">{v}%</Tag>
                      ),
                  },
                ]}
              />
            </Card>

            {/* 患者来源 */}
            <Card title="患者来源结构">
              <Table
                rowKey="name"
                pagination={false}
                dataSource={a.patientSources}
                locale={{ emptyText: '暂无来源数据' }}
                columns={[
                  { title: '来源', dataIndex: 'name' },
                  { title: '患者数', dataIndex: 'count', width: 120 },
                  {
                    title: '占比',
                    dataIndex: 'sharePct',
                    width: 120,
                    render: (v: number) => `${v}%`,
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
