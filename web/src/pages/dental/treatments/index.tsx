/** 健澜科技 jlmedaios - 口腔治疗（M283 DEMO） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; tooth: string; item: string; doctor: string; cost: number }
const DEMO: Row[] = [
  { id: 'DEN-001', patient: '王演示', tooth: '36', item: '根管治疗', doctor: '口腔科-刘医生', cost: 1200 },
  { id: 'DEN-002', patient: '赵演示', tooth: '11', item: '树脂充填', doctor: '口腔科-陈医生', cost: 350 },
];
export default function DentalTreatmentsPage() {
  usePageTitle('口腔治疗');
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
    { title: '牙位', dataIndex: 'tooth', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '治疗项目', dataIndex: 'item' },
    { title: '医生', dataIndex: 'doctor' },
    { title: '费用(元)', dataIndex: 'cost' },
  ];
  return (
    <PageContainer title="口腔治疗">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无治疗" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
