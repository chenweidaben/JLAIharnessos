/** 健澜科技 jlmedaios - 门诊详情（M256 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  visitNo: string; patient: { name: string; gender: string; age: number; medicalRecordNo: string };
  dept: string; doctor: string; diagnosis: string; prescriptions: string[];
  fees: { registration: number; exam: number; medicine: number; total: number; insurancePaid: number; selfPaid: number };
  visitTime: string;
}
export default function OutpatientDetailPage() {
  usePageTitle('门诊详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/outpatient/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="门诊详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="就诊号"><Tag color="blue">{data.visitNo}</Tag></Descriptions.Item>
                <Descriptions.Item label="就诊时间">{data.visitTime}</Descriptions.Item>
                <Descriptions.Item label="患者">{data.patient.name}（{data.patient.gender}, {data.patient.age} 岁, {data.patient.medicalRecordNo}）</Descriptions.Item>
                <Descriptions.Item label="科室/医生">{data.dept} / {data.doctor}</Descriptions.Item>
                <Descriptions.Item label="诊断" span={2}><Tag color="purple">{data.diagnosis}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="处方" style={{ marginBottom: 16 }}>
              <List size="small" dataSource={data.prescriptions} renderItem={(p) => <List.Item><Tag color="green">{p}</Tag></List.Item>} />
            </Card>
            <Row gutter={16}>
              <Col span={4}><Card><Statistic title="挂号费" value={data.fees.registration} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="检查费" value={data.fees.exam} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="药品费" value={data.fees.medicine} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="合计" value={data.fees.total} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="医保支付" value={data.fees.insurancePaid} prefix="¥" valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={4}><Card><Statistic title="自付" value={data.fees.selfPaid} prefix="¥" valueStyle={{ color: '#cf1322' }} /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
