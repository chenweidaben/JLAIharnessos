/** 健澜科技 jlmedaios - 安全态势看板（M309 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Anom { type: string; count: number; severity: string }
interface Data { threatLevel: string; activeThreats: number; blockedRequests24h: number; loginAttempts24h: number; failedLogins24h: number; anomalies: Anom[] }
export default function SecurityDashboardPage() {
  usePageTitle('安全态势');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/dashboard').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="安全态势看板" extra={data ? <Tag color={data.threatLevel === '低' ? 'green' : data.threatLevel === '中' ? 'orange' : 'red'}>威胁等级：{data.threatLevel}</Tag> : null}>
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="活跃威胁" value={data.activeThreats} /></Card></Col>
              <Col span={6}><Card><Statistic title="24h 拦截" value={data.blockedRequests24h} /></Card></Col>
              <Col span={6}><Card><Statistic title="24h 登录尝试" value={data.loginAttempts24h} /></Card></Col>
              <Col span={6}><Card><Statistic title="24h 失败登录" value={data.failedLogins24h} /></Card></Col>
            </Row>
            <Card title="异常事件"><List size="small" dataSource={data.anomalies} renderItem={(i) => <List.Item><Tag color={i.severity === '高' ? 'red' : i.severity === '中' ? 'orange' : 'blue'}>{i.severity}</Tag> {i.type} × {i.count}</List.Item>} /></Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}