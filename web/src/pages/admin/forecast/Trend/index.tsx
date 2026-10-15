/**
 * 健澜科技 jlmedaios — M154-C 【AI深化与运营预测】医院运营智能预测页（管理驾驶舱，仅 admin）
 *
 * 未来 N 天 门诊量 / 床位负荷 / 手术量 预测，点预测 + 95% 置信区间（浅蓝置信带）。
 * 方法：移动平均去趋势 + 星期季节因子 + 趋势线性外推；区间宽度来自历史拟合残差。
 * 三态：loading / error（可重试）/ empty（历史不足降级空集，不编造）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 医疗安全：预测仅供排班/物资准备辅助参考，不触发诊疗行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

interface ForecastBlock {
  metric: string;
  historyStart: string | null;
  historyEnd: string | null;
  historyPoints: number;
  forecast: ForecastPoint[];
  residualStd: number;
  confidenceLevel: number;
  modelMethod: string;
  degraded: boolean;
}

interface ForecastResponse {
  days: number;
  generatedAt: string;
  demo: boolean;
  outpatient: ForecastBlock;
  bed: ForecastBlock;
  surgery: ForecastBlock;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  band: 'rgba(30,111,191,0.15)',
  bg: '#f5f7fa',
};

interface ChartSpec {
  title: string;
  unit: string;
  block: ForecastBlock;
}

/** 单指标预测图：点预测实线 + 95% 置信带（lower 垫底、upper-lower 堆叠面积） */
function ForecastChart({ spec }: { spec: ChartSpec }) {
  const { title, unit, block } = spec;
  const option = useMemo<EChartsOption>(() => {
    const dates = block.forecast.map((p) => p.date.slice(5));
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => `${Number(v).toFixed(block.metric === 'bed_occupancy' ? 1 : 0)} ${unit}`,
      },
      legend: { data: ['点预测', '95% 置信区间'], top: 0 },
      grid: { left: 56, right: 24, top: 40, bottom: 32 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: VI.deep } },
      yAxis: { type: 'value', name: unit, axisLabel: { color: VI.deep } },
      series: [
        {
          name: '区间下界',
          type: 'line',
          data: block.forecast.map((p) => p.lower),
          lineStyle: { opacity: 0 },
          stack: 'band',
          symbol: 'none',
        },
        {
          name: '95% 置信区间',
          type: 'line',
          data: block.forecast.map((p) => Number((p.upper - p.lower).toFixed(2))),
          lineStyle: { opacity: 0 },
          stack: 'band',
          symbol: 'none',
          areaStyle: { color: VI.band },
        },
        {
          name: '点预测',
          type: 'line',
          data: block.forecast.map((p) => p.value),
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: VI.accent, width: 3 },
          itemStyle: { color: VI.accent },
          label: { show: true, color: VI.deep, fontSize: 11 },
        },
      ],
    };
  }, [block, unit]);

  if (block.degraded) {
    return (
      <Card size="small" bordered={false} style={{ borderTop: `3px solid ${VI.accent}` }}>
        <div style={{ fontWeight: 600, color: VI.deep, marginBottom: 8 }}>{title}</div>
        <Alert type="info" showIcon message="历史样本不足 14 天，已降级为空集，不编造预测。" />
      </Card>
    );
  }

  return (
    <Card size="small" bordered={false} style={{ borderTop: `3px solid ${VI.accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontWeight: 600, color: VI.deep }}>{title}</div>
        <Tag color="blue">残差σ={block.residualStd}{unit}</Tag>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', margin: '4px 0 8px' }}>
        历史 {block.historyStart} ~ {block.historyEnd} · {block.historyPoints} 天样本 ·{' '}
        {(block.confidenceLevel * 100).toFixed(0)}% 置信
      </div>
      <ReactECharts option={option} style={{ height: 280 }} />
    </Card>
  );
}

export default function OpsForecastTrendPage() {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/forecast?days=7');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ForecastResponse);
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

  const allDegraded =
    data && data.outpatient.degraded && data.bed.degraded && data.surgery.degraded;

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
          运营智能预测（AI深化与运营预测）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          移动平均 + 星期季节因子 + 趋势外推 · 区间来自历史残差（95% 置信）· 仅供运营排班/物资准备参考
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1360, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在计算运营预测…" />
          </div>
        )}

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

        {!loading && !error && data && allDegraded && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="暂无足够历史数据（各指标均不足 14 天），预测已降级为空集，不编造数字。接入完整运营历史后将自动成图。"
          />
        )}

        {!loading && !error && data && (
          <>
            {data.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式：未连接真实运营数据库，预测区为空。"
              />
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="预测天数" value={data.days} suffix="天" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="门诊样本"
                    value={data.outpatient.historyPoints}
                    suffix="天"
                    valueStyle={{ color: data.outpatient.degraded ? '#bfbfbf' : VI.deep }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="床位样本"
                    value={data.bed.historyPoints}
                    suffix="天"
                    valueStyle={{ color: data.bed.degraded ? '#bfbfbf' : VI.deep }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="手术样本"
                    value={data.surgery.historyPoints}
                    suffix="天"
                    valueStyle={{ color: data.surgery.degraded ? '#bfbfbf' : VI.deep }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <ForecastChart
                  spec={{ title: '门诊量预测（人次/日）', unit: '人次', block: data.outpatient }}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <ForecastChart
                  spec={{ title: '床位负荷预测（在院/入院人次）', unit: '人', block: data.bed }}
                />
              </Col>
              <Col span={12}>
                <ForecastChart
                  spec={{ title: '手术量预测（台次/日）', unit: '台', block: data.surgery }}
                />
              </Col>
            </Row>

            <Paragraph style={{ marginTop: 16, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              生成时间：{new Date(data.generatedAt).toLocaleString()} · 模型：{data.outpatient.modelMethod} ·
              预测仅供运营辅助，资源调度须人工确认后执行。
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
