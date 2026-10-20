/** 健澜科技 jlmedaios - 病历质控看板（M278 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Spin, Statistic } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { todayReviewed: number; passRate: number; defectCount: number; avgDeduction: number; pendingDoctors: number; rectificationRate: number }
export default function EmrQualityDashboardPage() {
  usePageTitle('病历质控看板');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/quality-dashboard').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="病历质控看板">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="今日已审" value={data.todayReviewed} /></Card></Col>
            <Col span={6}><Card><Statistic title="合格率" value={data.passRate} suffix="%" valueStyle={{ color: '#3f8600' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="缺陷数" value={data.defectCount} valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="待整改医生" value={data.pendingDoctors} /></Card></Col>
            <Col span={6} style={{ marginTop: 16 }}><Card><Statistic title="平均扣分" value={data.avgDeduction} /></Card></Col>
            <Col span={6} style={{ marginTop: 16 }}><Card><Statistic title="整改率" value={data.rectificationRate} suffix="%" valueStyle={{ color: '#3f8600' }} /></Card></Col>
          </Row>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
