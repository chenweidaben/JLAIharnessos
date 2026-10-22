/**
 * 健澜科技 jlmedaios - 考勤管理（M737，升级自 M294 简易页）
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
import { useAttendanceM737Store } from '@/store/attendanceM737Store';
import {
  ATTENDANCE_STATUS_META,
  type AttendanceRecord,
} from '@/services/api/attendanceM737';

const leaveColumns: ColumnsType<{ type: string; days: number; reason: string }> = [
  { title: '请假类型', dataIndex: 'type' },
  { title: '天数', dataIndex: 'days', align: 'right' },
  { title: '事由', dataIndex: 'reason' },
];

const overtimeColumns: ColumnsType<{ date: string; hours: number; reason: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '时长(h)', dataIndex: 'hours', align: 'right' },
  { title: '事由', dataIndex: 'reason' },
];

const buildColumns = (setDetail: (r: AttendanceRecord) => void): ColumnsType<AttendanceRecord> => [
  { title: '员工姓名', dataIndex: 'employee', width: 110 },
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '日期', dataIndex: 'date', width: 110 },
  { title: '上班', dataIndex: 'clockIn', width: 90, render: (v: string | null) => v ?? '—' },
  { title: '下班', dataIndex: 'clockOut', width: 90, render: (v: string | null) => v ?? '—' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: AttendanceRecord['status']) => <Tag color={ATTENDANCE_STATUS_META[v].color}>{ATTENDANCE_STATUS_META[v].label}</Tag>,
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

export default function HrAttendancePage() {
  usePageTitle('考勤管理');
  const { items, loading, error, demo, load } = useAttendanceM737Store();
  const [detail, setDetail] = useState<AttendanceRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="考勤管理"
      description="员工姓名 / 科室 / 日期 / 上下班时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`考勤记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="考勤详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="员工姓名">{detail.employee}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={ATTENDANCE_STATUS_META[detail.status].color}>{ATTENDANCE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="上班时间">{detail.clockIn ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="下班时间">{detail.clockOut ?? '—'}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="请假记录" style={{ marginBottom: 16 }}>
              {detail.leaves.length
                ? <Table rowKey="type" dataSource={detail.leaves} columns={leaveColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无请假记录</span>}
            </Card>
            <Card size="small" title="加班记录">
              {detail.overtime.length
                ? <Table rowKey="date" dataSource={detail.overtime} columns={overtimeColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无加班记录</span>}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
