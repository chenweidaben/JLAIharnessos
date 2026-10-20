/** 健澜科技 jlmedaios - 医嘱详情（M302 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { orderNo: string; patient: string; drug: string; dosage: string; route: string; frequency: string; startAt: string; stopAt: string }
export default function OrderDetailPage() {
  usePageTitle('医嘱详情');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/order/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="医嘱详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card><Descriptions column={2} bordered size="small">
            <Descriptions.Item label="医嘱号"><Tag color="purple">{data.orderNo}</Tag></Descriptions.Item>
            <Descriptions.Item label="患者">{data.patient}</Descriptions.Item>
            <Descriptions.Item label="药品">{data.drug}</Descriptions.Item>
            <Descriptions.Item label="剂量">{data.dosage}</Descriptions.Item>
            <Descriptions.Item label="给药途径">{data.route}</Descriptions.Item>
            <Descriptions.Item label="频次">{data.frequency}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{data.startAt}</Descriptions.Item>
            <Descriptions.Item label="停止时间">{data.stopAt}</Descriptions.Item>
          </Descriptions></Card>
        ) : <Card><Empty description="暂无医嘱" /></Card>}
      </Spin>
    </PageContainer>
  );
}