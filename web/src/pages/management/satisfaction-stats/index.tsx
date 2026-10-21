/**
 * 健澜科技 jlmedaios - 满意度统计看板（M618，P11 智慧服务）
 *
 * 三甲流程：评分卡（总体均分/总应答/优秀率）+ 科室排名 Table（按 score 倒序）
 * + 趋势简易柱（Progress 宽度近似）。权限码 satisfaction:view。
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
import { useSatisfactionStatsM618Store } from '@/store/satisfactionStatsM618Store';
import type { DeptRankRow } from '@/services/api/satisfactionStatsM618';

export default function SatisfactionStatsM618Page() {
  usePageTitle('满意度统计');
  const { hasPermission } = usePermission();
  const canView = hasPermission('satisfaction:view');

  const { stats, loading, error, demo, load } = useSatisfactionStatsM618Store();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<DeptRankRow> = [
    { title: '科室编码', dataIndex: 'deptCode', width: 130 },
    { title: '科室', dataIndex: 'deptName', width: 160 },
    { title: '应答数', dataIndex: 'responses', width: 100 },
    {
      title: '均分（5 分制）',
      dataIndex: 'score',
      width: 260,
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: 'descend',
      render: (v: number) => <Progress percent={v * 20} size="small" format={() => v.toFixed(2)} />,
    },
  ];

  return (
    <PageContainer
      title="满意度统计"
      description="总体评分 + 科室排名 + 月度趋势"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 satisfaction:view 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="总体均分（5 分制）" precision={2} value={stats?.overallScore ?? 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="总应答数" value={stats?.totalResponses ?? 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="优秀率（%）" precision={1} value={stats?.excellentRate ?? 0} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={14}>
            <Card size="small" title="科室排名">
              <Table rowKey="deptCode" dataSource={stats?.deptRank ?? []} columns={columns} size="small" pagination={false} />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="月度趋势">
              {(stats?.trend ?? []).map((t) => (
                <div key={t.date} style={{ marginBottom: 12 }}>
                  <span style={{ marginRight: 8 }}>{t.date}</span>
                  <Progress percent={t.score * 20} size="small" format={() => t.score.toFixed(2)} />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
