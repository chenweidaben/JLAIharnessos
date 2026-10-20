/** 健澜科技 jlmedaios - 财务大屏（M245 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data {
  todayRevenue: number; monthRevenue: number; budgetExecutionRate: number;
  top10Departments: { name: string; revenue: number }[];
}
export default function BiFinancePage() {
  usePageTitle('财务大屏');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/finance-dashboard').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="财务大屏">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="今日收入" value={data.todayRevenue} prefix="¥" suffix="万" /></Card></Col>
              <Col span={8}><Card><Statistic title="本月累计收入" value={data.monthRevenue} prefix="¥" suffix="万" /></Card></Col>
              <Col span={8}><Card><Statistic title="预算执行率" value={data.budgetExecutionRate} suffix="%" /></Card></Col>
            </Row>
            <Card title="收入 Top10 科室" style={{ marginTop: 16 }}>
              <List size="small" dataSource={data.top10Departments} renderItem={(d) => (
                <List.Item><span style={{ flex: 1 }}><Tag color="gold">{d.name}</Tag></span><span>¥{d.revenue} 万</span></List.Item>
              )} />
            </Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
