/** 健澜科技 jlmedaios - 收费项目详情（M244 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail { itemName: string; itemCode: string; price: number; insuranceCategory: string; unit: string; dept: string; priceBasis: string }
export default function PricingDetailPage() {
  usePageTitle('收费项目详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pricing/details').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="收费项目详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="项目名称" span={2}><Tag color="blue">{data.itemName}</Tag></Descriptions.Item>
              <Descriptions.Item label="项目编码">{data.itemCode}</Descriptions.Item>
              <Descriptions.Item label="单价"><Tag color="gold">¥{data.price} / {data.unit}</Tag></Descriptions.Item>
              <Descriptions.Item label="医保类别"><Tag color={data.insuranceCategory === '甲类' ? 'green' : 'blue'}>{data.insuranceCategory}</Tag></Descriptions.Item>
              <Descriptions.Item label="执行科室">{data.dept}</Descriptions.Item>
              <Descriptions.Item label="定价依据" span={2}>{data.priceBasis}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
