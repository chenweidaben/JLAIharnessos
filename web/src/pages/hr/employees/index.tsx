/** 健澜科技 jlmedaios - 员工花名册（M278 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; employeeNo: string; dept: string; title: string; education: string; hireDate: string; status: string }
export default function HrEmployeesPage() {
  usePageTitle('员工花名册');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/employees').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.employees ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '工号', dataIndex: 'employeeNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '姓名', dataIndex: 'name' },
    { title: '科室', dataIndex: 'dept' },
    { title: '职称', dataIndex: 'title' },
    { title: '学历', dataIndex: 'education' },
    { title: '入职日期', dataIndex: 'hireDate' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在职' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="员工花名册">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无员工" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}