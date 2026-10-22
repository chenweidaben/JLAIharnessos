/**
 * 健澜科技 jlmedaios - 运营管理驾驶舱（M830）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
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
import { useOperationsOverviewM830Store } from '@/store/operationsOverviewM830Store';

const trendColumns: ColumnsType<{ month: string; revenue: number }> = [
  { title: '月份', dataIndex: 'month' },
  { title: '收入（万元）', dataIndex: 'revenue', align: 'right' },
];

const rankColumns: ColumnsType<{ name: string; revenue: number }> = [
  { title: '科室', dataIndex: 'name' },
  { title: '收入（万元）', dataIndex: 'revenue', align: 'right' },
];

const costColumns: ColumnsType<{ item: string; ratio: number }> = [
  { title: '成本项', dataIndex: 'item' },
  { title: '占比', dataIndex: 'ratio', align: 'right', render: (v: number) => `${v}%` },
];

export default function OperationsDashboardM830Page() {
  usePageTitle('运营管理驾驶舱');
  const { items, loading, error, demo, load } = useOperationsOverviewM830Store();
  const data = items[0];

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="运营管理驾驶舱"
      description="收入 / 药耗占比 / 医保拒付 / 趋势 / 排名 / 成本结构"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Spin spinning={loading}>
        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="本月业务收入" value={data.revenue} prefix="¥" suffix="万" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="药品占比" value={data.drugRatio} suffix="%" precision={1} valueStyle={{ color: data.drugRatio > 30 ? '#cf1322' : '#3f8600' }} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="耗材占比" value={data.consumableRatio} suffix="%" precision={1} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="医保拒付率" value={data.insuranceDenyRate} suffix="%" precision={2} valueStyle={{ color: data.insuranceDenyRate > 1 ? '#cf1322' : '#3f8600' }} /></Card></Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={16}>
                <Card size="small" title="近 12 月收入趋势（万元）">
                  <Table rowKey="month" dataSource={data.monthlyTrend} columns={trendColumns} size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="成本结构">
                  <Table rowKey="item" dataSource={data.costStructure} columns={costColumns} size="small" pagination={false} />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="科室收入 Top 5（万元）">
              <Table rowKey="name" dataSource={data.deptRanking} columns={rankColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
