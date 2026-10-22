/**
 * 健澜科技 jlmedaios - 预约挂号管理（M718）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useAppointmentM718Store } from '@/store/appointmentM718Store';
import {
  APPT_CHANNEL_META,
  APPT_STATUS_META,
  type Appointment,
} from '@/services/api/appointmentM718';

const buildColumns = (setDetail: (r: Appointment) => void): ColumnsType<Appointment> => [
  { title: '预约号', dataIndex: 'apptNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 130 },
  { title: '医生', dataIndex: 'doctor', width: 110 },
  {
    title: '预约时间',
    dataIndex: 'scheduledAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: Appointment['status']) => <Tag color={APPT_STATUS_META[v].color}>{APPT_STATUS_META[v].label}</Tag>,
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

export default function AppointmentRegistrationM718Page() {
  usePageTitle('预约挂号管理');
  const { items, loading, error, demo, load } = useAppointmentM718Store();
  const [detail, setDetail] = useState<Appointment | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="预约挂号管理"
      description="预约号 / 患者 / 科室 / 医生 / 预约时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`预约挂号（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="预约挂号详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="预约号">{detail.apptNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="就诊科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="接诊医生">{detail.doctor}</Descriptions.Item>
            <Descriptions.Item label="预约时间">{dayjs(detail.scheduledAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="预约渠道">{APPT_CHANNEL_META[detail.channel]}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={APPT_STATUS_META[detail.status].color}>{APPT_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
