/** 健澜科技 jlmedaios - 财务管理（M223 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Spin, Statistic, Tag } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface RevenueCat { today: number; month: number; yoyGrowth: number }
interface RevenueData { outpatient: RevenueCat; inpatient: RevenueCat; drug: RevenueCat; examination: RevenueCat; surgery: RevenueCat }
export default function FinancialPage() {
  usePageTitle('财务管理');
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/finance/revenue').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as RevenueData); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const items = data ? ([['门诊收入', data.outpatient], ['住院收入', data.inpatient], ['药品收入', data.drug], ['检查收入', data.examination], ['手术收入', data.surgery]] as [string, RevenueCat][]) : [];
  return (
    <PageContainer title="财务管理（收入统计 万元）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Row gutter={16}>
          {items.map(([name, cat]) => (
            <Col span={8} key={name} style={{ marginBottom: 16 }}>
              <Card>
                <Statistic title={name} value={cat.month} precision={1} suffix="万" />
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue">今日 {cat.today} 万</Tag>
                  <Tag color="green" icon={<ArrowUpOutlined />}>YoY {cat.yoyGrowth}%</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </PageContainer>
  );
}
