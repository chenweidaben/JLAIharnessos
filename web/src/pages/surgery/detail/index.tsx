/** 健澜科技 jlmedaios - 手术详情（M252 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  patient: string; surgeryName: string; surgeon: string; assistants: string[];
  anesthesia: string; incisionClass: string; bloodLoss: number; bloodTransfusion: number;
  duration: string; start: string; end: string;
}
export default function SurgeryDetailPage() {
  usePageTitle('手术详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/surgery/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="手术详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card title={<Tag color="blue">{data.patient}</Tag>} style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="手术名称" span={2}><Tag color="purple">{data.surgeryName}</Tag></Descriptions.Item>
                <Descriptions.Item label="主刀医生">{data.surgeon}</Descriptions.Item>
                <Descriptions.Item label="助手">{data.assistants.join('、')}</Descriptions.Item>
                <Descriptions.Item label="麻醉方式">{data.anesthesia}</Descriptions.Item>
                <Descriptions.Item label="切口类别"><Tag color="orange">{data.incisionClass}</Tag></Descriptions.Item>
                <Descriptions.Item label="开始时间">{data.start}</Descriptions.Item>
                <Descriptions.Item label="结束时间">{data.end}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="手术时长" value={data.duration} /></Card></Col>
              <Col span={8}><Card><Statistic title="出血量(ml)" value={data.bloodLoss} valueStyle={{ color: data.bloodLoss > 200 ? '#cf1322' : '#3f8600' }} /></Card></Col>
              <Col span={8}><Card><Statistic title="输血量(ml)" value={data.bloodTransfusion} /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无手术详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
