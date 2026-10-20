/** 健澜科技 jlmedaios - 药品详情（M256 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  drugName: string; genericName: string; specification: string; dosageForm: string;
  insuranceCategory: string; stock: number; unitPrice: number; manufacturer: string;
  usage: string; storageCondition: string;
}
export default function MedicationDetailPage() {
  usePageTitle('药品详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/medication/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="药品详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="药品名" span={2}><Tag color="purple">{data.drugName}</Tag> <span style={{ color: '#666' }}>({data.genericName})</span></Descriptions.Item>
                <Descriptions.Item label="规格">{data.specification}</Descriptions.Item>
                <Descriptions.Item label="剂型">{data.dosageForm}</Descriptions.Item>
                <Descriptions.Item label="医保类别"><Tag color={data.insuranceCategory === '甲类医保' ? 'green' : 'blue'}>{data.insuranceCategory}</Tag></Descriptions.Item>
                <Descriptions.Item label="厂家">{data.manufacturer}</Descriptions.Item>
                <Descriptions.Item label="用法" span={2}>{data.usage}</Descriptions.Item>
                <Descriptions.Item label="储存条件" span={2}>{data.storageCondition}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Row gutter={16}>
              <Col span={12}><Card><Statistic title="库存" value={data.stock} suffix="盒" /></Card></Col>
              <Col span={12}><Card><Statistic title="单价" value={data.unitPrice} prefix="¥" precision={2} /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
