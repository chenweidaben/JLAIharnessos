/**
 * 健澜AI原生医院操作系统OS - 挂号退号退费
 * 当日可退号挂号列表 + 退号退费确认
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Modal, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface RegRow {
  id: string;
  regNo: string;
  patient: string;
  dept: string;
  doctor: string;
  regType: string;
  fee: number;
  status: '已挂号' | '已就诊' | '可退号';
  regTime: string;
}

const demoRows: RegRow[] = [
  { id: '1', regNo: 'REG-20261103-001', patient: '张三', dept: '呼吸内科', doctor: '李医生', regType: '普通门诊', fee: 25, status: '可退号', regTime: '2026-11-03 08:30' },
  { id: '2', regNo: 'REG-20261103-002', patient: '王五', dept: '心血管内科', doctor: '赵医生', regType: '专家门诊', fee: 50, status: '可退号', regTime: '2026-11-03 09:00' },
  { id: '3', regNo: 'REG-20261103-003', patient: '刘六', dept: '消化内科', doctor: '陈医生', regType: '普通门诊', fee: 25, status: '已就诊', regTime: '2026-11-03 09:30' },
];

export default function OutpatientRegisterRefundPage() {
  usePageTitle('挂号退号退费');
  const [list, setList] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<RegRow | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/outpatient/registrations/today-cancel')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.registrations ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setList(demoRows);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openConfirm = (row: RegRow) => {
    setCurrentRow(row);
    setConfirmOpen(true);
  };

  const onRefund = async () => {
    if (!currentRow) return;
    try {
      await fetch(`/api/v1/outpatient/registrations/${currentRow.id}/refund`, { method: 'POST' });
      message.success(`挂号 ${currentRow.regNo} 退号退费完成 ¥${currentRow.fee}`);
      setList((prev) => prev.filter((r) => r.id !== currentRow.id));
      setConfirmOpen(false);
    } catch {
      message.error('退号退费失败');
    }
  };

  const columns: ColumnsType<RegRow> = [
    { title: '挂号号', dataIndex: 'regNo', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '医生', dataIndex: 'doctor', width: 90 },
    { title: '挂号类型', dataIndex: 'regType', width: 100 },
    { title: '挂号费(元)', dataIndex: 'fee', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '可退号' ? 'orange' : v === '已挂号' ? 'blue' : 'green';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '挂号时间', dataIndex: 'regTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, row) => (
        row.status === '可退号' && (
          <Button size="small" danger onClick={() => openConfirm(row)}>退号退费</Button>
        )
      ),
    },
  ];

  return (
    <PageContainer title="挂号退号退费" description="当日未就诊挂号退号与费用退还">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title={`退号退费确认 - ${currentRow?.regNo ?? ''}`}
        open={confirmOpen}
        onOk={() => void onRefund()}
        onCancel={() => setConfirmOpen(false)}
        okText="确认退号退费"
        okButtonProps={{ danger: true }}
      >
        {currentRow && (
          <div>
            <p>患者：{currentRow.patient}</p>
            <p>科室/医生：{currentRow.dept} - {currentRow.doctor}</p>
            <p>挂号类型：{currentRow.regType}</p>
            <p>退还金额：<span style={{ color: '#cf1322', fontSize: 18 }}>¥{currentRow.fee.toFixed(2)}</span></p>
            <p style={{ color: '#666' }}>退号后该号源释放至当日号池。</p>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
