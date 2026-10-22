/**
 * 健澜科技 jlmedaios - 科室管理（M745）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDepartmentM745Store } from '@/store/departmentM745Store';
import {
  DEPT_STATUS_META,
  type Department,
} from '@/services/api/departmentM745';

const staffingColumns: ColumnsType<{ position: string; headcount: number }> = [
  { title: '岗位', dataIndex: 'position' },
  { title: '编制人数', dataIndex: 'headcount', align: 'right' },
];

const buildColumns = (setDetail: (r: Department) => void): ColumnsType<Department> => [
  { title: '科室编码', dataIndex: 'code', width: 160 },
  { title: '科室名称', dataIndex: 'name', width: 160 },
  { title: '科室类型', dataIndex: 'type', width: 130 },
  { title: '上级科室', dataIndex: 'parent', width: 160 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Department['status']) => <Tag color={DEPT_STATUS_META[v].color}>{DEPT_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function DepartmentsM745Page() {
  usePageTitle('科室管理');
  const { items, loading, error, demo, load } = useDepartmentM745Store();
  const [detail, setDetail] = useState<Department | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="科室管理"
      description="科室编码 / 科室名称 / 科室类型 / 上级科室 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`科室列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="科室详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="科室编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="科室名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="科室类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="上级科室">{detail.parent}</Descriptions.Item>
              <Descriptions.Item label="床位配置">{detail.beds} 张</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={DEPT_STATUS_META[detail.status].color}>{DEPT_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="人员编制">
              <Table rowKey="position" dataSource={detail.staffing} columns={staffingColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
