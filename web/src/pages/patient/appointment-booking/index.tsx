/**
 * 健澜科技 jlmedaios - 预约挂号（M615，P11 智慧服务三级）
 *
 * 三甲流程：日期选择 → 号源日历 Grid（剩余号源 Tag）→ 选择时段开预约 Modal →
 * POST /appointments → 我的预约 Table。权限码 appointment:book。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAppointmentBookingM615Store } from '@/store/appointmentBookingM615Store';
import type { AppointmentRecord, SlotItem } from '@/services/api/appointmentBookingM615';

const STATUS_META: Record<AppointmentRecord['status'], { label: string; color: string }> = {
  booked: { label: '已预约', color: 'blue' },
  checkedIn: { label: '已签到', color: 'green' },
  completed: { label: '已完成', color: 'default' },
  cancelled: { label: '已取消', color: 'red' },
};

export default function AppointmentBookingM615Page() {
  usePageTitle('预约挂号');
  const { hasPermission } = usePermission();
  const canBook = hasPermission('appointment:book');

  const { patientId, records, slots, loading, acting, error, demo, load, loadSlots, book } =
    useAppointmentBookingM615Store();

  const [date, setDate] = useState<Dayjs | null>(dayjs().add(1, 'day'));
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<SlotItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    void load(patientId);
    if (date) void loadSlots(date.format('YYYY-MM-DD'));
  }, [load, loadSlots, patientId, date]);

  const onBook = async () => {
    if (!activeSlot) return;
    const values = await form.validateFields();
    const ok = await book({
      patientId,
      doctorId: activeSlot.doctorId,
      deptCode: activeSlot.deptCode,
      appointmentDate: activeSlot.date,
      timeSlot: activeSlot.timeSlot,
      visitType: values.visitType,
      source: 'patient_portal',
    });
    if (ok) {
      message.success(`已预约 ${activeSlot.doctorName} ${activeSlot.date} ${activeSlot.timeSlot}`);
      setModalOpen(false);
      setActiveSlot(null);
      form.resetFields();
    }
  };

  const columns: ColumnsType<AppointmentRecord> = [
    { title: '预约单号', dataIndex: 'id', width: 110 },
    { title: '科室', dataIndex: 'deptCode', width: 110 },
    { title: '医生', dataIndex: 'doctorId', width: 100 },
    { title: '日期', dataIndex: 'appointmentDate', width: 130 },
    { title: '时段', dataIndex: 'timeSlot', width: 130 },
    { title: '就诊类型', dataIndex: 'visitType', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: AppointmentRecord['status']) => (
        <Tag color={STATUS_META[v].color}>{STATUS_META[v].label}</Tag>
      ),
    },
  ];

  return (
    <PageContainer
      title="预约挂号"
      description="号源日历 + 在线预约（POST /appointments，409 重复预约拦截）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canBook && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 appointment:book 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }} title="选择就诊日期">
        <Space>
          <DatePicker value={date} onChange={(d) => setDate(d)} allowClear={false} />
          <Input
            style={{ width: 200 }}
            addonBefore="患者"
            defaultValue={patientId}
            onPressEnter={(e) => void load((e.target as HTMLInputElement).value)}
          />
        </Space>
      </Card>

      <Card size="small" title="号源" style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Space wrap>
            {slots.map((s, i) => (
              <Button
                key={`${s.doctorId}-${s.timeSlot}-${i}`}
                disabled={s.remain <= 0}
                onClick={() => {
                  setActiveSlot(s);
                  setModalOpen(true);
                }}
              >
                {s.doctorName} {s.timeSlot}
                <Tag color={s.remain > 3 ? 'green' : s.remain > 0 ? 'orange' : 'red'}>
                  {s.remain > 0 ? `余 ${s.remain}` : '约满'}
                </Tag>
              </Button>
            ))}
          </Space>
        </Spin>
      </Card>

      <Card size="small" title={`我的预约（${records.length}）`}>
        <Table rowKey="id" dataSource={records} columns={columns} size="small" pagination={{ pageSize: 8 }} />
      </Card>

      <Modal open={modalOpen} title="确认预约" onCancel={() => setModalOpen(false)} footer={null}>
        {activeSlot && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`${activeSlot.doctorName}（${activeSlot.deptCode}）· ${activeSlot.date} ${activeSlot.timeSlot}`}
          />
        )}
        <Form form={form} layout="vertical" initialValues={{ visitType: 'outpatient' }}>
          <Form.Item name="visitType" label="就诊类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'outpatient', label: '初诊' },
                { value: 'followup', label: '复诊' },
                { value: 'expert', label: '专家门诊' },
              ]}
            />
          </Form.Item>
          <Space>
            <Button type="primary" loading={acting} onClick={() => void onBook()}>
              确认预约
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
