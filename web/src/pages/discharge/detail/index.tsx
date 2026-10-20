/** 健澜科技 jlmedaios - 出院详情（M256 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Detail {
  dischargeNo: string; patient: string; admissionDate: string; dischargeDate: string; losDays: number;
  dischargeDiagnosis: string; dischargeOrders: string[];
  followupPlan: { dept: string; date: string; contact: string };
  fees: { total: number; insurancePaid: number; selfPaid: number; deposit: number; refund: number };
}
export default function DischargeDetailPage() {
  usePageTitle('出院详情');
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/discharge/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Detail); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="出院详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="出院号"><Tag color="blue">{data.dischargeNo}</Tag></Descriptions.Item>
                <Descriptions.Item label="患者">{data.patient}</Descriptions.Item>
                <Descriptions.Item label="入院日期">{data.admissionDate}</Descriptions.Item>
                <Descriptions.Item label="出院日期">{data.dischargeDate}（住 {data.losDays} 天）</Descriptions.Item>
                <Descriptions.Item label="出院诊断" span={2}><Tag color="purple">{data.dischargeDiagnosis}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="出院带药/医嘱" style={{ marginBottom: 16 }}>
              <List size="small" dataSource={data.dischargeOrders} renderItem={(o) => <List.Item><Tag color="green">{o}</Tag></List.Item>} />
            </Card>
            <Card title="随访计划" style={{ marginBottom: 16 }}>
              <Descriptions column={3} size="small">
                <Descriptions.Item label="随访科室">{data.followupPlan.dept}</Descriptions.Item>
                <Descriptions.Item label="随访时间">{data.followupPlan.date}</Descriptions.Item>
                <Descriptions.Item label="联系人">{data.followupPlan.contact}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Row gutter={16}>
              <Col span={5}><Card><Statistic title="总费用" value={data.fees.total} prefix="¥" /></Card></Col>
              <Col span={5}><Card><Statistic title="医保支付" value={data.fees.insurancePaid} prefix="¥" valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={5}><Card><Statistic title="自付" value={data.fees.selfPaid} prefix="¥" valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={5}><Card><Statistic title="押金" value={data.fees.deposit} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="退款" value={data.fees.refund} prefix="¥" /></Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无详情" /></Card>}
      </Spin>
    </PageContainer>
  );
}
