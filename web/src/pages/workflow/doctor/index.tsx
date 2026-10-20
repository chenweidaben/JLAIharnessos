/** 健澜科技 jlmedaios - 医生工作流（M272 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { role: string; pendingPatients: number; inProgressPatients: number; completedPatients: number; todayStats: { totalVisits: number; avgVisitTime: string; prescriptionsIssued: number; referrals: number } }
export default function WorkflowDoctorPage() {
  usePageTitle('医生工作流');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/doctor').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="医生工作流 KPI">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="待处理" value={data.pendingPatients} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="进行中" value={data.inProgressPatients} /></Card></Col>
              <Col span={6}><Card><Statistic title="今日完成" value={data.completedPatients} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="总就诊" value={data.todayStats.totalVisits} /></Card></Col>
            </Row>
            <Card>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="平均就诊时长"><Tag color="blue">{data.todayStats.avgVisitTime}</Tag></Descriptions.Item>
                <Descriptions.Item label="开处方数">{data.todayStats.prescriptionsIssued}</Descriptions.Item>
                <Descriptions.Item label="转诊数">{data.todayStats.referrals}</Descriptions.Item>
                <Descriptions.Item label="角色"><Tag color="purple">{data.role}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
