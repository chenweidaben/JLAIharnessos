/**
 * 健澜科技 jlmedaios - 院感管理驾驶舱（M832）
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
import { useInfectionOverviewM832Store } from '@/store/infectionOverviewM832Store';

const trendColumns: ColumnsType<{ date: string; cases: number }> = [
  { title: '日期', dataIndex: 'date' },
  { title: '院感病例数', dataIndex: 'cases', align: 'right' },
];

const siteColumns: ColumnsType<{ site: string; rate: number }> = [
  { title: '重点部位', dataIndex: 'site' },
  { title: '感染率（‰）', dataIndex: 'rate', align: 'right', render: (v: number) => v.toFixed(2) },
];

const warningColumns: ColumnsType<{ ward: string; cases: number; threshold: number }> = [
  { title: '病区', dataIndex: 'ward' },
  {
    title: '当前病例 / 阈值',
    key: 'comp',
    render: (_v, row) => (
      <Tag color={row.cases > row.threshold ? 'red' : 'green'}>
        {row.cases} / {row.threshold}
      </Tag>
    ),
  },
];

export default function InfectionControlDashboardM832Page() {
  usePageTitle('院感管理驾驶舱');
  const { items, loading, error, demo, load } = useInfectionOverviewM832Store();
  const data = items[0];

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="院感管理驾驶舱"
      description="院感 KPI / 趋势 / 重点部位 / 暴发预警"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Spin spinning={loading}>
        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="院感发生率" value={data.infectionRate} suffix="%" precision={2} valueStyle={{ color: data.infectionRate > 3 ? '#cf1322' : '#3f8600' }} />
                </Card>
              </Col>
              <Col span={6}><Card size="small"><Statistic title="手卫生依从率" value={data.handHygieneCompliance} suffix="%" precision={1} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="消毒合格率" value={data.disinfectionPassRate} suffix="%" precision={1} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="抗菌药物使用强度" value={data.antibioticDensity} suffix="DDDs/100" precision={1} /></Card></Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" title="近 30 日院感病例趋势">
                  <Table rowKey="date" dataSource={data.trend} columns={trendColumns} size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="暴发预警">
                  <Table rowKey="ward" dataSource={data.outbreakWarning} columns={warningColumns} size="small" pagination={false} />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="重点部位感染（VAP / CAUTI / CLABSI）">
              <Table rowKey="site" dataSource={data.siteInfections} columns={siteColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
