/** 健澜科技 jlmedaios - 设备详情（M243 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  name: string; assetNo: string; model: string; manufacturer: string;
  purchaseDate: string; originalValue: number; netValue: number; status: string; location: string;
}
export default function EquipmentDetailPage() {
  usePageTitle('设备详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/equipment/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="设备详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="设备名称" span={2}><Tag color="blue">{data.name}</Tag></Descriptions.Item>
              <Descriptions.Item label="资产编号">{data.assetNo}</Descriptions.Item>
              <Descriptions.Item label="型号">{data.model}</Descriptions.Item>
              <Descriptions.Item label="厂家">{data.manufacturer}</Descriptions.Item>
              <Descriptions.Item label="购置日期">{data.purchaseDate}</Descriptions.Item>
              <Descriptions.Item label="原值(万)">{data.originalValue}</Descriptions.Item>
              <Descriptions.Item label="净值(万)"><Tag color="green">{data.netValue}</Tag></Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={data.status === '在用' ? 'green' : 'orange'}>{data.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="位置" span={2}>{data.location}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
