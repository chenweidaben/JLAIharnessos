/**
 * 健澜科技 jlmedaios - 院长驾驶舱（M828）
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
import { useHospitalOverviewM828Store } from '@/store/hospitalOverviewM828Store';

const trendColumns: ColumnsType<{ date: string; count: number }> = [
  { title: '日期', dataIndex: 'date' },
  { title: '门诊量', dataIndex: 'count', align: 'right' },
];

const todoColumns: ColumnsType<{ type: string; count: number; urgent: number }> = [
  { title: '类别', dataIndex: 'type' },
  { title: '总数', dataIndex: 'count', align: 'right' },
  { title: '紧急', dataIndex: 'urgent', align: 'right', render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag> },
];

export default function HospitalDirectorDashboardM828Page() {
  usePageTitle('院长驾驶舱');
  const { items, loading, error, demo, load } = useHospitalOverviewM828Store();
  const data = items[0];

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="院长驾驶舱"
      description="今日运行 / 重点指标 / 待办一屏总览"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Spin spinning={loading}>
        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="今日门诊量" value={data.todayOutpatient} suffix="人次" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="在院人数" value={data.inpatients} suffix="人" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="今日手术数" value={data.todaySurgeries} suffix="台" /></Card></Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="床位使用率" value={data.bedOccupancy} suffix="%" precision={1} />
                  <Progress percent={data.bedOccupancy} showInfo={false} strokeColor={data.bedOccupancy > 95 ? 'red' : 'blue'} />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card size="small"><Statistic title="平均住院日" value={data.avgLodDays} suffix="天" precision={1} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="次均费用" value={data.avgCost} prefix="¥" /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="患者满意度" value={data.satisfaction} suffix="%" precision={1} /></Card></Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="近 7 日门诊量趋势">
                  <Table rowKey="date" dataSource={data.outpatientTrend} columns={trendColumns} size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="待办事项">
                  <Table rowKey="type" dataSource={data.todos} columns={todoColumns} size="small" pagination={false} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
