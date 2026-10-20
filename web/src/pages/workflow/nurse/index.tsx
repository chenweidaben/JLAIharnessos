/** 健澜科技 jlmedaios - 护士工作流（M272 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { role: string; pendingTasks: number; inProgressTasks: number; completedTasks: number; todayStats: { totalTasks: number; medicationAdmin: number; vitalSigns: number; dressingChanges: number; other: number } }
export default function WorkflowNursePage() {
  usePageTitle('护士工作流');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/nurse').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="护士工作流 KPI">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="待处理" value={data.pendingTasks} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="进行中" value={data.inProgressTasks} /></Card></Col>
              <Col span={6}><Card><Statistic title="已完成" value={data.completedTasks} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="今日总任务" value={data.todayStats.totalTasks} /></Card></Col>
            </Row>
            <Card>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="用药执行">{data.todayStats.medicationAdmin}</Descriptions.Item>
                <Descriptions.Item label="生命体征">{data.todayStats.vitalSigns}</Descriptions.Item>
                <Descriptions.Item label="换药用">{data.todayStats.dressingChanges}</Descriptions.Item>
                <Descriptions.Item label="其他">{data.todayStats.other}</Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
