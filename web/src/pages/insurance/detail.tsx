/** 健澜科技 jlmedaios - 医保结算详情（M243 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  patient: string; totalCost: number; insuranceReimbursed: number;
  selfPay: number; reimbursementRate: number; settleTime: string;
}
export default function InsuranceDetailPage() {
  usePageTitle('医保结算详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/insurance/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="医保结算详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="患者"><Tag color="blue">{data.patient}</Tag></Descriptions.Item>
              <Descriptions.Item label="结算时间">{data.settleTime}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'flex', gap: 32 }}>
              <Statistic title="总费用(元)" value={data.totalCost} precision={2} prefix="¥" />
              <Statistic title="医保支付(元)" value={data.insuranceReimbursed} precision={2} valueStyle={{ color: '#3f8600' }} prefix="¥" />
              <Statistic title="自付(元)" value={data.selfPay} precision={2} valueStyle={{ color: '#cf1322' }} prefix="¥" />
              <Statistic title="报销比例" value={data.reimbursementRate} suffix="%" precision={1} />
            </div>
          </Card>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
