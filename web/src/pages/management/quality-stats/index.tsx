/**
 * 健澜科技 jlmedaios - 医疗质量指标（M626，P13 管理驾驶舱）
 *
 * 三甲流程：KPI 指标卡（平均住院日/术前平均住院日/床位周转/治愈率）
 *   达标绿（#3f8600）、未达标橙（#cf1322）；科室质量排名 Table。
 * 权限码 stats:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useQualityStatsM626Store } from '@/store/qualityStatsM626Store';

interface DeptRow {
  deptCode: string;
  deptName: string;
  score: number;
  cureRatePct: number;
}

export default function QualityStatsM626Page() {
  usePageTitle('医疗质量指标');
  const { hasPermission } = usePermission();
  const canView = hasPermission('stats:view');

  const { stats, loading, error, demo, load } = useQualityStatsM626Store();

  useEffect(() => {
    void load();
  }, [load]);

  const losOk = stats ? stats.avgLOS <= stats.targetAvgLOS : true;
  const turnoverOk = stats ? stats.bedTurnover >= stats.targetBedTurnover : true;
  const cureOk = stats ? stats.cureRatePct >= stats.targetCureRatePct : true;

  const columns: ColumnsType<DeptRow> = [
    { title: '科室编码', dataIndex: 'deptCode', width: 130 },
    { title: '科室', dataIndex: 'deptName', width: 140 },
    { title: '质量评分', dataIndex: 'score', width: 240, sorter: (a, b) => a.score - b.score, defaultSortOrder: 'descend', render: (v: number) => <Progress percent={v} size="small" /> },
    { title: '治愈率（%）', dataIndex: 'cureRatePct', width: 120, sorter: (a, b) => a.cureRatePct - b.cureRatePct },
  ];

  return (
    <PageContainer
      title="医疗质量指标"
      description="平均住院日 / 术前住院日 / 床位周转 / 治愈率（达标绿 · 未达标橙）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 stats:view 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="平均住院日（天）"
                precision={1}
                value={stats?.avgLOS ?? 0}
                valueStyle={{ color: losOk ? '#3f8600' : '#cf1322' }}
                suffix={`/ 目标 ${stats?.targetAvgLOS ?? 0}`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="术前平均住院日（天）" precision={1} value={stats?.preopLOS ?? 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="床位周转（次/年）"
                precision={1}
                value={stats?.bedTurnover ?? 0}
                valueStyle={{ color: turnoverOk ? '#3f8600' : '#cf1322' }}
                suffix={`/ 目标 ${stats?.targetBedTurnover ?? 0}`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="治愈率（%）"
                precision={1}
                value={stats?.cureRatePct ?? 0}
                valueStyle={{ color: cureOk ? '#3f8600' : '#cf1322' }}
                suffix={`/ 目标 ${stats?.targetCureRatePct ?? 0}`}
              />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="科室质量排名">
          <Table rowKey="deptCode" dataSource={stats?.deptQuality ?? []} columns={columns} size="small" pagination={false} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
