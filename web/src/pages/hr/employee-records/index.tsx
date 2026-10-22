/**
 * 健澜科技 jlmedaios - 员工档案管理（M733）
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
import { useEmployeeRecordM733Store } from '@/store/employeeRecordM733Store';
import {
  EMP_STATUS_META,
  type EmployeeRecord,
} from '@/services/api/employeeRecordM733';

const eduColumns: ColumnsType<{ school: string; degree: string; period: string }> = [
  { title: '学校', dataIndex: 'school' },
  { title: '学位', dataIndex: 'degree', width: 100 },
  { title: '时间段', dataIndex: 'period', width: 140 },
];

const workColumns: ColumnsType<{ org: string; role: string; period: string }> = [
  { title: '单位', dataIndex: 'org' },
  { title: '职务', dataIndex: 'role' },
  { title: '时间段', dataIndex: 'period', width: 140 },
];

const titleColumns: ColumnsType<{ from: string; to: string; change: string }> = [
  { title: '起', dataIndex: 'from', width: 110 },
  { title: '止', dataIndex: 'to', width: 110 },
  { title: '职称', dataIndex: 'change' },
];

const buildColumns = (setDetail: (r: EmployeeRecord) => void): ColumnsType<EmployeeRecord> => [
  { title: '工号', dataIndex: 'empNo', width: 110 },
  { title: '姓名', dataIndex: 'name', width: 110 },
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '职称', dataIndex: 'title', width: 140 },
  { title: '入职日期', dataIndex: 'joinedAt', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: EmployeeRecord['status']) => <Tag color={EMP_STATUS_META[v].color}>{EMP_STATUS_META[v].label}</Tag>,
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

export default function EmployeeRecordsM733Page() {
  usePageTitle('员工档案管理');
  const { items, loading, error, demo, load } = useEmployeeRecordM733Store();
  const [detail, setDetail] = useState<EmployeeRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="员工档案管理"
      description="工号 / 姓名 / 科室 / 职称 / 入职日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`员工档案（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="员工档案详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="工号">{detail.empNo}</Descriptions.Item>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="职称">{detail.title}</Descriptions.Item>
              <Descriptions.Item label="入职日期">{detail.joinedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={EMP_STATUS_META[detail.status].color}>{EMP_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="基本信息" span={2}>{detail.basicInfo}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="教育背景" style={{ marginBottom: 16 }}>
              <Table rowKey="school" dataSource={detail.education} columns={eduColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="工作经历" style={{ marginBottom: 16 }}>
              <Table rowKey={(r) => `${r.org}-${r.period}`} dataSource={detail.workExperience} columns={workColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="职称变更记录">
              <Table rowKey="from" dataSource={detail.titleHistory} columns={titleColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
