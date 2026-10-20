/** 健澜科技 jlmedaios - 质量大屏（M245 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data {
  cureRate: number; improvementRate: number; deathRate: number;
  infectionRate: number; criticalRescueRate: number; surgeryComplicationRate: number;
  targets: Record<string, { target: number; status: string }>;
}
export default function BiQualityPage() {
  usePageTitle('质量大屏');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/quality-dashboard').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="医疗质量大屏">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Row gutter={16}>
            <Col span={4}><Card><Statistic title="治愈率" value={data.cureRate} suffix="%" /></Card></Col>
            <Col span={4}><Card><Statistic title="好转率" value={data.improvementRate} suffix="%" /></Card></Col>
            <Col span={4}><Card><Statistic title="死亡率" value={data.deathRate} suffix="%" valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col span={4}><Card><Statistic title="院感率" value={data.infectionRate} suffix="%" valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col span={4}><Card><Statistic title="危重抢救成功率" value={data.criticalRescueRate} suffix="%" valueStyle={{ color: '#3f8600' }} /></Card></Col>
            <Col span={4}><Card><Statistic title="手术并发症率" value={data.surgeryComplicationRate} suffix="%" /></Card></Col>
          </Row>
        ) : <Card><Empty description="暂无数据" /></Card>}
        {data && (
          <Card title="指标达标情况" style={{ marginTop: 16 }}>
            {Object.entries(data.targets).map(([k, v]) => (
              <Tag key={k} color={v.status === '达标' ? 'green' : 'orange'} style={{ margin: 4 }}>
                {k}：{v.status}（目标 ≥{v.target}%）
              </Tag>
            ))}
          </Card>
        )}
      </Spin>
    </PageContainer>
  );
}
