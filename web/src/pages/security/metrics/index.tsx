/** 健澜科技 jlmedaios - 安全运营 KPI（M269 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { mttr: string; mtdd: string; blockRate: string; complianceRate: string; period: string }
export default function SecurityMetricsPage() {
  usePageTitle('安全运营 KPI');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/metrics').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="安全运营 KPI">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Tag color="purple">统计周期：{data.period}</Tag>
            </Card>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="MTTR" value={data.mttr} /></Card></Col>
              <Col span={6}><Card><Statistic title="MTTD" value={data.mtdd} /></Card></Col>
              <Col span={6}><Card><Statistic title="拦截率" value={data.blockRate} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="合规率" value={data.complianceRate} valueStyle={{ color: '#3f8600' }} /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无指标" /></Card>}
      </Spin>
    </PageContainer>
  );
}
