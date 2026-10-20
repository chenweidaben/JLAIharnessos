/** 健澜科技 jlmedaios - 门诊叫号（M280 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col,  Empty, Row, Spin, Statistic, Tag, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Waiting { number: string; name: string; status: string }
interface Data { dept: string; currentNumber: string; waitingList: Waiting[] }
export default function OutpatientQueuePage() {
  usePageTitle('门诊叫号');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/outpatient/queue').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Waiting> = [
    { title: '号', dataIndex: 'number', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '姓名', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (
    <PageContainer title="门诊叫号">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card><Statistic title="当前科室" value={data.dept} /></Card></Col>
              <Col span={8}><Card><Statistic title="当前叫号" value={data.currentNumber} valueStyle={{ color: '#3f8600' }} /></Card></Col>
              <Col span={8}><Card><Statistic title="候诊人数" value={data.waitingList.length} /></Card></Col>
            </Row>
            <Card title="候诊列表">
              <Table rowKey="number" columns={columns} dataSource={data.waitingList} pagination={false} locale={{ emptyText: <Empty description="暂无候诊" /> }} />
            </Card>
          </>
        ) : <Card><Empty description="暂无叫号" /></Card>}
      </Spin>
    </PageContainer>
  );
}
