/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊统计：在院概览 / 分诊级别分布 / 转归分布（真实 BFF GET /emergency/stats）
 * 说明：近7天趋势、疾病谱、时段热力图需历史聚合，M1-B1 端点未提供，不做假图。
 */
import { useEffect } from 'react';
import { Card, Col, Empty, Row, Statistic } from 'antd';
import { PieChart } from '@/components/charts';

import { useEmergencyStore } from '@/store/emergencyStore';
import { DISPOSITION_META, TRIAGE_LEVEL_META } from './constants';

export default function EmergencyStatsView() {
  const { stats, fetchStats } = useEmergencyStore();

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (!stats) {
    return (
      <Card className="shadow-card">
        <Empty description="统计数据加载中…" />
      </Card>
    );
  }

  const levelData = ([1, 2, 3, 4] as const)
    .map((lv) => ({
      name: TRIAGE_LEVEL_META[lv].label,
      value: stats.levelCounts[lv] ?? 0,
    }))
    .filter((d) => d.value > 0);

  const dispositionData = Object.entries(stats.dispositionCounts)
    .map(([k, v]) => ({
      name: DISPOSITION_META[k as keyof typeof DISPOSITION_META]?.label ?? k,
      value: v,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      {/* 在院概览 */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="在院急诊" value={stats.activeCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="待分诊" value={stats.waitingCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="抢救中" value={stats.resusCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="留观中" value={stats.obsCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="shadow-card">
            <Statistic title="绿色通道" value={stats.greenChannelCount} suffix="条" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="在院分诊级别分布" className="shadow-card">
            {levelData.length ? (
              <PieChart data={levelData} height={300} />
            ) : (
              <Empty description="暂无在院分诊患者" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="当日转归分布" className="shadow-card">
            {dispositionData.length ? (
              <PieChart data={dispositionData} height={300} />
            ) : (
              <Empty description="暂无转归记录" />
            )}
          </Card>
        </Col>
      </Row>

      <Card className="shadow-card">
        <div className="text-xs leading-relaxed text-ink-secondary">
          口径说明：本统计为实时在院快照（clinical.emergency_triage / green_channels /
          resuscitations / observations / emergency_dispositions）。近 7 天就诊趋势、
          疾病谱 TOP10、星期×小时热力图、抢救成功率趋势等历史聚合指标，将在后续统计
          分析模块提供；M1-B1 不以静态/模拟图表占位。
        </div>
      </Card>
    </div>
  );
}
