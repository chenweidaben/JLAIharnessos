/** 健澜科技 jlmedaios - 病理报告详情（M243 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, List, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface IHC { marker: string; result: string }
interface Detail {
  patient: { name: string; gender: string; age: number; patientId: string };
  specimenType: string;
  diagnosis: string;
  ihc: IHC[];
}
export default function PathologyDetailPage() {
  usePageTitle('病理报告详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pathology/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="病理报告详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Row gutter={16}>
            <Col span={14}>
              <Card title="标本与诊断">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="患者">{data.patient.name}（{data.patient.gender}, {data.patient.age} 岁, {data.patient.patientId}）</Descriptions.Item>
                  <Descriptions.Item label="标本类型">{data.specimenType}</Descriptions.Item>
                  <Descriptions.Item label="病理诊断"><Tag color="red">{data.diagnosis}</Tag></Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={10}>
              <Card title="免疫组化（IHC）">
                <List size="small" dataSource={data.ihc} renderItem={(i) => (
                  <List.Item><span style={{ flex: 1 }}>{i.marker}</span><Tag color={i.result === '阴性' ? 'default' : 'green'}>{i.result}</Tag></List.Item>
                )} />
              </Card>
            </Col>
          </Row>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
