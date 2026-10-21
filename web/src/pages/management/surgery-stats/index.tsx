/**
 * 健澜科技 jlmedaios - 手术量统计（M625，P13 管理驾驶舱）
 *
 * 三甲流程：今日/本周/本月手术卡 + 分级（I-IV级）占比 Progress 条
 * + 术者排名 Table。权限码 stats:view。
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
import { useSurgeryStatsM625Store } from '@/store/surgeryStatsM625Store';

interface SurgeonRow {
  surgeonCode: string;
  surgeonName: string;
  count: number;
}

export default function SurgeryStatsM625Page() {
  usePageTitle('手术量统计');
  const { hasPermission } = usePermission();
  const canView = hasPermission('stats:view');

  const { stats, loading, error, demo, load } = useSurgeryStatsM625Store();

  useEffect(() => {
    void load();
  }, [load]);

  const totalGrade = (stats?.gradeDist ?? []).reduce((s, g) => s + g.count, 0);
  const maxSurgeon = Math.max(1, ...(stats?.surgeonRank ?? []).map((s) => s.count));

  const columns: ColumnsType<SurgeonRow> = [
    { title: '术者编码', dataIndex: 'surgeonCode', width: 130 },
    { title: '术者', dataIndex: 'surgeonName', width: 140 },
    {
      title: '手术量',
      dataIndex: 'count',
      width: 260,
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <Progress percent={Math.round((v / maxSurgeon) * 100)} size="small" format={() => String(v)} />
      ),
    },
  ];

  return (
    <PageContainer
      title="手术量统计"
      description="今日/本周/本月手术量 + I-IV 级分级占比 + 术者排名"
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
            <Card size="small">
              <Statistic title="今日手术" value={stats?.todayCount ?? 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="本周手术" value={stats?.weekCount ?? 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="本月手术" value={stats?.monthCount ?? 0} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={10}>
            <Card size="small" title="手术分级占比（I–IV 级）">
              {(stats?.gradeDist ?? []).map((g) => (
                <div key={g.grade} style={{ marginBottom: 10 }}>
                  <span style={{ marginRight: 8, fontSize: 12 }}>
                    {g.grade}（{g.count}）
                  </span>
                  <Progress
                    percent={totalGrade ? Math.round((g.count / totalGrade) * 100) : 0}
                    size="small"
                  />
                </div>
              ))}
            </Card>
          </Col>
          <Col span={14}>
            <Card size="small" title="术者手术量排名">
              <Table rowKey="surgeonCode" dataSource={stats?.surgeonRank ?? []} columns={columns} size="small" pagination={false} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
