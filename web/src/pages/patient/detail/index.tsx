/** 健澜科技 jlmedaios - 患者详情（M301 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, List, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { id: string; basicInfo: { name: string; gender: string; age: number; idCard: string; phone: string }; diagnoses: string[]; medications: string[] }
export default function PatientDetailPage() {
  usePageTitle('患者详情');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="患者详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Row gutter={16}>
            <Col span={12}><Card title="基本信息"><Descriptions column={1} size="small">
              <Descriptions.Item label="姓名">{data.basicInfo.name}</Descriptions.Item>
              <Descriptions.Item label="性别">{data.basicInfo.gender}</Descriptions.Item>
              <Descriptions.Item label="年龄">{data.basicInfo.age}</Descriptions.Item>
              <Descriptions.Item label="身份证">{data.basicInfo.idCard}</Descriptions.Item>
              <Descriptions.Item label="电话">{data.basicInfo.phone}</Descriptions.Item>
            </Descriptions></Card></Col>
            <Col span={12}>
              <Card title="诊断"><List size="small" dataSource={data.diagnoses} renderItem={(i) => <List.Item><Tag color="red">{i}</Tag></List.Item>} /></Card>
              <Card title="在用药" style={{ marginTop: 16 }}><List size="small" dataSource={data.medications} renderItem={(i) => <List.Item><Tag color="blue">{i}</Tag></List.Item>} /></Card>
            </Col>
          </Row>
        ) : <Card><Empty description="暂无患者" /></Card>}
      </Spin>
    </PageContainer>
  );
}