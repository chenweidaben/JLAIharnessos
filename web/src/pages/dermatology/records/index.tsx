/** 健澜科技 jlmedaios - 皮肤科病历（M283 DEMO） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; lesion: string; diagnosis: string; medication: string; followup: string }
const DEMO: Row[] = [
  { id: 'DER-001', patient: '吴演示', lesion: '面部红斑', diagnosis: '脂溢性皮炎', medication: '他克莫司软膏外用', followup: '2 周后复诊' },
];
export default function DermatologyRecordsPage() {
  usePageTitle('皮肤科病历');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    setTimeout(() => { if (alive) setList(DEMO); setLoading(false); }, 200);
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '皮损部位', dataIndex: 'lesion', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '用药', dataIndex: 'medication' },
    { title: '随访', dataIndex: 'followup', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (
    <PageContainer title="皮肤科病历">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无病历" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
