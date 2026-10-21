/**
 * 健澜科技 jlmedaios - 门诊量统计（M623，P13 管理驾驶舱）
 *
 * 三甲流程：今日/本周/本月统计卡 + 科室门诊量排名 Table（进度条按最大值归一）
 * + 近 7 日趋势（Progress 近似折线）。权限码 stats:view。
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useOutpatientStatsM623Store } from '@/store/outpatientStatsM623Store';

interface DeptRow {
  deptCode: string;
  deptName: string;
  count: number;
}

export default function OutpatientStatsM623Page() {
  usePageTitle('门诊量统计');
  const { hasPermission } = usePermission();
  const canView = hasPermission('stats:view');

  const { stats, loading, error, demo, load } = useOutpatientStatsM623Store();

  useEffect(() => {
    void load();
  }, [load]);

  const maxDept = Math.max(1, ...(stats?.deptRank ?? []).map((d) => d.count));
  const maxTrend = Math.max(1, ...(stats?.trend ?? []).map((t) => t.count));

  const columns: ColumnsType<DeptRow> = [
    { title: '科室编码', dataIndex: 'deptCode', width: 130 },
    { title: '科室', dataIndex: 'deptName', width: 140 },
    {
      title: '今日门诊量',
      dataIndex: 'count',
      width: 260,
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <Progress percent={Math.round((v / maxDept) * 100)} size="small" format={() => String(v)} />
      ),
    },
  ];

  return (
    <PageContainer
      title="门诊量统计"
      description="今日 / 本周 / 本月门诊量 + 科室排名 + 近 7 日趋势"
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
              <Statistic title="今日门诊量" value={stats?.todayCount ?? 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="本周门诊量" value={stats?.weekCount ?? 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="本月门诊量" value={stats?.monthCount ?? 0} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={14}>
            <Card size="small" title="科室门诊量排名">
              <Table
                rowKey="deptCode"
                dataSource={stats?.deptRank ?? []}
                columns={columns}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="近 7 日趋势">
              {(stats?.trend ?? []).map((t) => (
                <div key={t.date} style={{ marginBottom: 10 }}>
                  <span style={{ marginRight: 8, fontSize: 12 }}>
                    {dayjs(t.date).format('MM-DD')}（{t.count}）
                  </span>
                  <Progress percent={Math.round((t.count / maxTrend) * 100)} size="small" showInfo={false} />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
