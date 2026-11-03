/**
 * 健澜AI原生医院操作系统OS - 入院登记作业
 * 待分配床位患者列表 + 床位选择 + 腕带打印确认
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Modal, Select, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface CheckinRow {
  id: string;
  admissionNo: string;
  patient: string;
  gender: string;
  age: number;
  dept: string;
  diagnosis: string;
  priority: '普通' | '急诊' | '危重';
  status: '待分配床位' | '已分配' | '已入院';
  applyTime: string;
}

const demoRows: CheckinRow[] = [
  { id: '1', admissionNo: 'ADM-20261103-001', patient: '张三', gender: '男', age: 45, dept: '呼吸内科', diagnosis: '肺部感染', priority: '普通', status: '待分配床位', applyTime: '2026-11-03 08:30' },
  { id: '2', admissionNo: 'ADM-20261103-002', patient: '王五', gender: '女', age: 62, dept: '心血管内科', diagnosis: '急性心衰', priority: '急诊', status: '待分配床位', applyTime: '2026-11-03 09:00' },
  { id: '3', admissionNo: 'ADM-20261103-003', patient: '刘六', gender: '男', age: 38, dept: '消化内科', diagnosis: '急性肠胃炎', priority: '普通', status: '已分配', applyTime: '2026-11-03 09:20' },
];

const bedOptions = [
  { value: '呼吸科-12床', label: '呼吸科-12床' },
  { value: '呼吸科-15床', label: '呼吸科-15床' },
  { value: '心内科-08床', label: '心内科-08床' },
  { value: '心内科-10床', label: '心内科-10床' },
  { value: '消化科-21床', label: '消化科-21床' },
  { value: '消化科-23床', label: '消化科-23床' },
];

export default function InpatientCheckinPage() {
  usePageTitle('入院登记作业');
  const [list, setList] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bedModalOpen, setBedModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<CheckinRow | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/admissions/pending-bed')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.admissions ?? [];
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

  const openBedModal = (row: CheckinRow) => {
    setCurrentRow(row);
    setSelectedBed('');
    setBedModalOpen(true);
  };

  const onAssignBed = async () => {
    if (!currentRow || !selectedBed) {
      message.warning('请先选择床位');
      return;
    }
    try {
      await fetch(`/api/v1/admissions/${currentRow.id}/assign-bed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedNo: selectedBed }),
      });
      message.success(`患者 ${currentRow.patient} 已分配床位 ${selectedBed}`);
      setList((prev) => prev.map((r) => r.id === currentRow.id ? { ...r, status: '已分配' as const } : r));
      setBedModalOpen(false);
    } catch {
      message.error('床位分配失败');
    }
  };

  const onWristband = async (row: CheckinRow) => {
    try {
      await fetch(`/api/v1/admissions/${row.id}/wristband`, { method: 'POST' });
      message.success(`患者 ${row.patient} 腕带已打印`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已入院' as const } : r));
    } catch {
      message.error('腕带打印失败');
    }
  };

  const columns: ColumnsType<CheckinRow> = [
    { title: '住院号', dataIndex: 'admissionNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '诊断', dataIndex: 'diagnosis' },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      render: (v: string) => {
        const color = v === '急诊' ? 'red' : v === '危重' ? 'magenta' : 'default';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const color = v === '待分配床位' ? 'orange' : v === '已分配' ? 'blue' : 'green';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '申请时间', dataIndex: 'applyTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, row) => (
        <Space size="small">
          {row.status === '待分配床位' && (
            <Button size="small" type="primary" onClick={() => openBedModal(row)}>分配床位</Button>
          )}
          {row.status === '已分配' && (
            <Button size="small" onClick={() => void onWristband(row)}>打印腕带</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="入院登记作业" description="待分配床位患者登记与床位分配、腕带打印">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title={`分配床位 - ${currentRow?.patient ?? ''}（${currentRow?.dept ?? ''}）`}
        open={bedModalOpen}
        onOk={() => void onAssignBed()}
        onCancel={() => setBedModalOpen(false)}
        okText="确认分配"
      >
        <div style={{ marginBottom: 12 }}>请选择空闲床位：</div>
        <Select
          style={{ width: '100%' }}
          placeholder="选择床位"
          value={selectedBed || undefined}
          onChange={(v) => setSelectedBed(v)}
          options={bedOptions}
        />
      </Modal>
    </PageContainer>
  );
}
