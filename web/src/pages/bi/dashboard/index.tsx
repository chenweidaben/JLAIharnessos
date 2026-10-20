/** 健澜科技 jlmedaios - 运营大屏（M245 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data {
  todayOutpatient: number; currentInpatient: number; todaySurgery: number;
  bedOccupancyRate: number; todayRevenue: number;
  last7Days: number[]; top5Departments: { name: string; value: number }[];
}
export default function BiDashboardPage() {
  usePageTitle('运营大屏');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/dashboard').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="运营大屏">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16}>
              {[
                { title: '今日门诊', value: data.todayOutpatient, suffix: '人' },
                { title: '在院患者', value: data.currentInpatient, suffix: '人' },
                { title: '今日手术', value: data.todaySurgery, suffix: '台' },
                { title: '床位使用率', value: data.bedOccupancyRate, suffix: '%' },
                { title: '今日收入', value: data.todayRevenue, prefix: '¥', suffix: '万' },
              ].map((s, i) => (
                <Col span={4} key={i}><Card><Statistic {...s} /></Card></Col>
              ))}
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={14}>
                <Card title="近 7 天门诊量">
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                    {data.last7Days.map((v, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: `${(v / Math.max(...data.last7Days)) * 140}px`, background: '#1E5F8C', borderRadius: 4 }} />
                        <div style={{ fontSize: 12, marginTop: 4 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
              <Col span={10}>
                <Card title="门诊 Top5 科室">
                  <List size="small" dataSource={data.top5Departments} renderItem={(d) => (
                    <List.Item><span style={{ flex: 1 }}><Tag color="blue">{d.name}</Tag></span><span>{d.value}</span></List.Item>
                  )} />
                </Card>
              </Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
