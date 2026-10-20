/** 健澜科技 jlmedaios - 患者 360 概览（M274 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { patient: { id: string; name: string; gender: string; age: number; mrn: string }; diagnoses: { code: string; name: string; severity: string }[] }
export default function Patient360OverviewPage() {
  usePageTitle('患者 360 概览');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/360-overview').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="患者 360 概览">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="姓名"><Tag color="purple">{data.patient.name}</Tag></Descriptions.Item>
              <Descriptions.Item label="病历号">{data.patient.mrn}</Descriptions.Item>
              <Descriptions.Item label="性别">{data.patient.gender}</Descriptions.Item>
              <Descriptions.Item label="年龄">{data.patient.age}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="诊断" column={1} size="small">
              {data.diagnoses.map((d) => (
                <Descriptions.Item key={d.code} label={d.code}>
                  <Tag color={d.severity === '中度' ? 'orange' : 'red'}>{d.name} / {d.severity}</Tag>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无患者" /></Card>}
      </Spin>
    </PageContainer>
  );
}
