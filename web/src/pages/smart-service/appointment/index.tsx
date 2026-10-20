/** 健澜科技 jlmedaios - 预约挂号（M275 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { todayAppointments: number; weekAppointments: number; monthAppointments: number; departmentDistribution: { department: string; count: number; pct: string }[] }
export default function SmartServiceAppointmentPage() {
  usePageTitle('预约挂号');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/appointment').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="预约挂号统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card><Statistic title="今日" value={data.todayAppointments} /></Card></Col>
              <Col span={8}><Card><Statistic title="本周" value={data.weekAppointments} /></Card></Col>
              <Col span={8}><Card><Statistic title="本月" value={data.monthAppointments} /></Card></Col>
            </Row>
            <Card title="科室分布">
              <Descriptions column={1} size="small">
                {data.departmentDistribution.map((d) => (
                  <Descriptions.Item key={d.department} label={d.department}>
                    <Tag color="blue">{d.count} 人 / {d.pct}</Tag>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
