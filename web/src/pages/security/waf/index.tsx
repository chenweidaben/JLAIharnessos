/** 健澜科技 jlmedaios - WAF 防护（M268 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Today { sqlInjection: { blocked: number; passed: number }; xss: { blocked: number; passed: number }; csrf: { blocked: number; passed: number }; crawler: { blocked: number; passed: number } }
interface Data { today: Today; ruleCount: number; status: string }
export default function SecurityWafPage() {
  usePageTitle('WAF 防护');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/waf').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="WAF 防护统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="规则数">{data.ruleCount}</Descriptions.Item>
                <Descriptions.Item label="状态"><Tag color="green">{data.status}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="SQL 注入拦截" value={data.today.sqlInjection.blocked} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="XSS 拦截" value={data.today.xss.blocked} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="CSRF 拦截" value={data.today.csrf.blocked} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="爬虫拦截" value={data.today.crawler.blocked} valueStyle={{ color: '#3f8600' }} /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
