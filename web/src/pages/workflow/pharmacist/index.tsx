/** 健澜科技 jlmedaios - 药师工作流（M272 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { role: string; pendingPrescriptions: number; reviewedPrescriptions: number; returnedPrescriptions: number; todayStats: { totalPrescriptions: number; interactionAlerts: number; doseAlerts: number; contraindicationAlerts: number } }
export default function WorkflowPharmacistPage() {
  usePageTitle('药师工作流');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/pharmacist').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="药师工作流 KPI">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="待审核" value={data.pendingPrescriptions} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="已审核" value={data.reviewedPrescriptions} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="退回" value={data.returnedPrescriptions} /></Card></Col>
              <Col span={6}><Card><Statistic title="今日处方" value={data.todayStats.totalPrescriptions} /></Card></Col>
            </Row>
            <Card>
              <Descriptions column={3} size="small" bordered>
                <Descriptions.Item label="相互作用告警"><Tag color="orange">{data.todayStats.interactionAlerts}</Tag></Descriptions.Item>
                <Descriptions.Item label="剂量告警"><Tag color="orange">{data.todayStats.doseAlerts}</Tag></Descriptions.Item>
                <Descriptions.Item label="禁忌告警"><Tag color="red">{data.todayStats.contraindicationAlerts}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
