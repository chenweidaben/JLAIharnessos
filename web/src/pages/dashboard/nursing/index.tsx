/**
 * 健澜科技 jlmedaios - 护理管理驾驶舱（M831）
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
import { useNursingOverviewM831Store } from '@/store/nursingOverviewM831Store';

const trendColumns: ColumnsType<{ date: string; score: number }> = [
  { title: '周次', dataIndex: 'date' },
  { title: '护理质量分', dataIndex: 'score', align: 'right' },
];

const rankColumns: ColumnsType<{ name: string; score: number }> = [
  { title: '科室', dataIndex: 'name' },
  { title: '护理质量分', dataIndex: 'score', align: 'right', render: (v: number) => v.toFixed(1) },
];

export default function NursingDashboardM831Page() {
  usePageTitle('护理管理驾驶舱');
  const { items, loading, error, demo, load } = useNursingOverviewM831Store();
  const data = items[0];

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="护理管理驾驶舱"
      description="护士配置 / 不良事件 / 质量趋势 / 科室排名 / 培训"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Spin spinning={loading}>
        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="护士总数" value={data.nurses} suffix="人" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="床护比" value={data.bedNurseRatio} precision={2} suffix=" : 1" /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="护理不良事件率" value={data.adverseEventRate} suffix="‰" precision={2} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="患者跌倒发生率" value={data.fallRate} suffix="‰" precision={2} valueStyle={{ color: data.fallRate > 0.3 ? '#cf1322' : '#3f8600' }} /></Card></Col>
            </Row>

            <Card size="small" title="培训完成率" style={{ marginBottom: 16 }}>
              <Progress percent={data.trainingCompletion} strokeColor={data.trainingCompletion >= 90 ? '#3f8600' : '#cf1322'} />
            </Card>

            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="近 30 日护理质量趋势">
                  <Table rowKey="date" dataSource={data.qualityTrend} columns={trendColumns} size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="科室护理质量排名">
                  <Table rowKey="name" dataSource={data.deptRanking} columns={rankColumns} size="small" pagination={false} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
