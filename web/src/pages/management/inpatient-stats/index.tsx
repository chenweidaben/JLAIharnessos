/**
 * 健澜科技 jlmedaios - 住院床位统计（M624，P13 管理驾驶舱）
 *
 * 三甲流程：床位使用率仪表盘（Progress type=circle）+ 空床/入院/出院 Statistic
 * + 科室床位 Table（使用率 Progress）。权限码 stats:view。
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
import { useInpatientStatsM624Store } from '@/store/inpatientStatsM624Store';

interface DeptRow {
  deptCode: string;
  deptName: string;
  total: number;
  occupied: number;
}

export default function InpatientStatsM624Page() {
  usePageTitle('住院床位统计');
  const { hasPermission } = usePermission();
  const canView = hasPermission('stats:view');

  const { stats, loading, error, demo, load } = useInpatientStatsM624Store();

  useEffect(() => {
    void load();
  }, [load]);

  const emptyBeds = (stats?.totalBeds ?? 0) - (stats?.occupiedBeds ?? 0);
  const rate = stats?.occupancyRatePct ?? 0;
  const rateColor = rate >= 95 ? 'red' : rate >= 85 ? 'orange' : 'blue';

  const columns: ColumnsType<DeptRow> = [
    { title: '科室编码', dataIndex: 'deptCode', width: 130 },
    { title: '科室', dataIndex: 'deptName', width: 140 },
    { title: '总床位', dataIndex: 'total', width: 100 },
    { title: '已占', dataIndex: 'occupied', width: 100 },
    {
      title: '使用率',
      dataIndex: 'occupied',
      render: (_: number, r) => (
        <Progress
          percent={r.total ? Math.round((r.occupied / r.total) * 100) : 0}
          size="small"
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="住院床位统计"
      description="全院床位使用率 + 空床/今日入出 + 科室床位明细"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 stats:view 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Progress type="circle" percent={rate} strokeColor={rateColor} />
              <div style={{ marginTop: 8 }}>全院床位使用率（%）</div>
            </Card>
          </Col>
          <Col span={16}>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="空床数" value={emptyBeds} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="今日入院" value={stats?.admittedToday ?? 0} valueStyle={{ color: '#3f8600' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="今日出院" value={stats?.dischargedToday ?? 0} valueStyle={{ color: '#1677ff' }} />
                </Card>
              </Col>
              <Col span={24} style={{ marginTop: 16 }}>
                <Card size="small">
                  <Statistic title="总床位 / 已占" value={stats?.totalBeds ?? 0} suffix={`/ ${stats?.occupiedBeds ?? 0}`} />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        <Card size="small" title="科室床位明细">
          <Table rowKey="deptCode" dataSource={stats?.deptBeds ?? []} columns={columns} size="small" pagination={false} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
