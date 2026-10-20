/** 健澜科技 jlmedaios - 智能导诊（M275 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { totalGuides: number; topDepartments: { department: string; count: number; pct: string }[] }
export default function SmartServiceGuidePage() {
  usePageTitle('智能导诊');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/guide').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="智能导诊统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><Card><Statistic title="今日导诊总次数" value={data.totalGuides} /></Card></Col>
            </Row>
            <Card title="Top 导诊科室">
              <Descriptions column={1} size="small">
                {data.topDepartments.map((d) => (
                  <Descriptions.Item key={d.department} label={d.department}>
                    <Tag color="purple">{d.count} 次 / {d.pct}</Tag>
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
