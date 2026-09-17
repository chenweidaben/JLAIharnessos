/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊统计：今日统计 / 趋势图表 / 疾病谱 / 时段热力图 / 质量指标
 */
import { useEffect } from 'react';
import { Card, Col, Progress, Row, Statistic } from 'antd';
import { BarChart, BaseChart, LineChart, PieChart } from '@/components/charts';
import type { EChartsOption } from 'echarts';

import { useEmergencyStore } from '@/store/emergencyStore';
import { formatPercent } from '@/utils/format';

export default function EmergencyStats() {
  const { emergencyStats, fetchEmergencyStats } = useEmergencyStore();

  useEffect(() => {
    void fetchEmergencyStats();
  }, [fetchEmergencyStats]);

  if (!emergencyStats) {
    return <Card className="shadow-card">统计数据加载中…</Card>;
  }

  const t = emergencyStats.today;

  // 24小时就诊量热力图（星期×小时）
  const heatmapOption: EChartsOption = {
    tooltip: { position: 'top' },
    grid: { left: 60, right: 20, top: 30, bottom: 60 },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 12 }, (_, i) => `${i * 2}:00`),
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 20,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#E6F0FA', '#1890FF', '#0A4D8C'] },
    },
    series: [
      {
        type: 'heatmap',
        data: emergencyStats.heatmap.map((h) => [
          Math.floor(h.hour / 2),
          ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].indexOf(h.day),
          h.value,
        ]),
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* 今日统计 */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="急诊总量" value={t.total} suffix="人次" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="抢救人数" value={t.resusCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="抢救成功率" value={formatPercent(t.resusSuccessRate)} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="留观人数" value={t.observationCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="绿色通道" value={t.greenChannelCount} suffix="条" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="平均等待" value={t.avgWaitMinutes} suffix="分钟" />
          </Card>
        </Col>
      </Row>

      {/* 趋势与分布 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="近7天急诊量趋势" className="shadow-card">
            <BarChart
              xData={emergencyStats.trend7d.map((d) => d.date)}
              series={[{ name: '急诊量', data: emergencyStats.trend7d.map((d) => d.count) }]}
              height={260}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="今日分诊级别分布" className="shadow-card">
            <PieChart
              data={emergencyStats.levelDistribution.map((d) => ({ name: d.name, value: d.value }))}
              height={260}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="疾病谱 TOP10" className="shadow-card">
            <BarChart
              xData={emergencyStats.diseaseTop10.map((d) => d.name)}
              series={[{ name: '人次', data: emergencyStats.diseaseTop10.map((d) => d.value) }]}
              height={280}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="24小时就诊量分布（星期×小时）" className="shadow-card">
            <BaseChart option={heatmapOption} height={280} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="等待时间趋势（分时段）" className="shadow-card">
            <LineChart
              xData={emergencyStats.waitTrend.map((w) => w.time)}
              series={[
                { name: '平均等待(分钟)', data: emergencyStats.waitTrend.map((w) => w.wait) },
              ]}
              height={240}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="抢救成功率趋势（近6月）" className="shadow-card">
            <LineChart
              xData={emergencyStats.resusSuccessTrend.map((r) => r.month)}
              series={[
                {
                  name: '成功率',
                  data: emergencyStats.resusSuccessTrend.map((r) => Math.round(r.rate * 100)),
                },
              ]}
              height={240}
            />
          </Card>
        </Col>
      </Row>

      {/* 质量指标 */}
      <Card title="急诊质量指标" className="shadow-card">
        <Row gutter={[16, 16]}>
          {emergencyStats.quality.map((q) => {
            const display = q.name === '留观超时率' ? q.value : q.value;
            const pct = Math.round(display * 100);
            const target = Math.round(q.target * 100);
            const ok = q.name === '留观超时率' ? q.value <= q.target : q.value >= q.target;
            return (
              <Col xs={12} md={8} key={q.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-primary">{q.name}</span>
                  <b style={{ color: ok ? '#52C41A' : '#F5222D' }}>{pct}%</b>
                </div>
                <Progress percent={pct} size="small" strokeColor={ok ? '#52C41A' : '#F5222D'} />
                <div className="text-xs text-ink-secondary">目标 {target}%</div>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
}
