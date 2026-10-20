/** 健澜科技 jlmedaios - 住院详情（M256 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  admissionNo: string; patient: { name: string; gender: string; age: number; medicalRecordNo: string };
  dept: string; bed: string; admissionDate: string; diagnosis: string; orders: string[];
  fees: { deposit: number; consumed: number; balance: number; days: number };
}
export default function InpatientDetailPage() {
  usePageTitle('住院详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/inpatient/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="住院详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="住院号"><Tag color="blue">{data.admissionNo}</Tag></Descriptions.Item>
                <Descriptions.Item label="入院日期">{data.admissionDate}</Descriptions.Item>
                <Descriptions.Item label="患者">{data.patient.name}（{data.patient.gender}, {data.patient.age} 岁, {data.patient.medicalRecordNo}）</Descriptions.Item>
                <Descriptions.Item label="科室/床号">{data.dept} / <Tag color="red">{data.bed}</Tag></Descriptions.Item>
                <Descriptions.Item label="诊断" span={2}><Tag color="purple">{data.diagnosis}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="医嘱" style={{ marginBottom: 16 }}>
              <List size="small" dataSource={data.orders} renderItem={(o) => <List.Item><Tag color="green">{o}</Tag></List.Item>} />
            </Card>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="押金" value={data.fees.deposit} prefix="¥" /></Card></Col>
              <Col span={6}><Card><Statistic title="已消费" value={data.fees.consumed} prefix="¥" valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="余额" value={data.fees.balance} prefix="¥" valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="住院天数" value={data.fees.days} suffix="天" /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
