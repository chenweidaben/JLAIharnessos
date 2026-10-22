/**
 * 健澜科技 jlmedaios - 医疗质量驾驶舱（M829）
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
import { useQualityOverviewM829Store } from '@/store/qualityOverviewM829Store';

const trendColumns: ColumnsType<{ date: string; score: number }> = [
  { title: '周次', dataIndex: 'date' },
  { title: '质量综合分', dataIndex: 'score', align: 'right' },
];

const rankColumns: ColumnsType<{ name: string; score: number }> = [
  { title: '科室', dataIndex: 'name' },
  { title: '得分', dataIndex: 'score', align: 'right', render: (v: number) => v.toFixed(1) },
];

const aeColumns: ColumnsType<{ type: string; count: number }> = [
  { title: '不良事件类型', dataIndex: 'type' },
  { title: '数量', dataIndex: 'count', align: 'right', render: (v: number) => <Tag color={v > 0 ? 'orange' : 'default'}>{v}</Tag> },
];

export default function MedicalQualityDashboardM829Page() {
  usePageTitle('医疗质量驾驶舱');
  const { items, loading, error, demo, load } = useQualityOverviewM829Store();
  const data = items[0];

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医疗质量驾驶舱"
      description="质量 KPI / 趋势 / 科室排名 / 不良事件"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Spin spinning={loading}>
        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="甲级病案率" value={data.gradeAChart} suffix="%" precision={1} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="三级查房率" value={data.round3WardRound} suffix="%" precision={1} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="危急值及时处理率" value={data.criticalValueTimely} suffix="%" precision={1} /></Card></Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="院内感染率" value={data.infectionRate} suffix="%" precision={2} valueStyle={{ color: data.infectionRate > 3 ? '#cf1322' : '#3f8600' }} />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" title="近 30 日质量综合分趋势">
                  <Table rowKey="date" dataSource={data.trend} columns={trendColumns} size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="不良事件统计">
                  <Table rowKey="type" dataSource={data.adverseEvents} columns={aeColumns} size="small" pagination={false} />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="Top 5 质量好科室">
                  <Table rowKey="name" dataSource={data.topDepartments} columns={rankColumns} size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="需改进科室">
                  <Table rowKey="name" dataSource={data.bottomDepartments} columns={rankColumns} size="small" pagination={false} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
