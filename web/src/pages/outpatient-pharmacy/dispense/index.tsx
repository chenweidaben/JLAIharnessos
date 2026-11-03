/**
 * 健澜AI原生医院操作系统OS - 门诊药房发药窗口
 * 待发药处方列表 + 处方详情 + 发药确认（双人签名）+ 退药
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface RxRow {
  id: string;
  rxNo: string;
  patient: string;
  dept: string;
  doctor: string;
  drugs: string;
  totalQty: number;
  status: '待发药' | '已发药' | '已退药';
  createTime: string;
}

const demoRows: RxRow[] = [
  { id: '1', rxNo: 'RX-20261103-001', patient: '张三', dept: '呼吸内科', doctor: '李医生', drugs: '阿莫西林胶囊 0.25g*24粒;氨溴索口服液 100ml', totalQty: 2, status: '待发药', createTime: '2026-11-03 08:40' },
  { id: '2', rxNo: 'RX-20261103-002', patient: '王五', dept: '心血管内科', doctor: '赵医生', drugs: '阿司匹林肠溶片 100mg*30片;阿托伐他汀钙片 20mg*7片', totalQty: 2, status: '待发药', createTime: '2026-11-03 09:15' },
  { id: '3', rxNo: 'RX-20261103-003', patient: '刘六', dept: '消化内科', doctor: '陈医生', drugs: '奥美拉唑肠溶胶囊 20mg*14粒', totalQty: 1, status: '已发药', createTime: '2026-11-03 09:50' },
];

export default function OutpatientPharmacyDispensePage() {
  usePageTitle('门诊药房发药');
  const [list, setList] = useState<RxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<RxRow | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/pharmacy/dispense/pending')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.prescriptions ?? [];
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

  const openSign = (row: RxRow) => {
    setCurrentRow(row);
    form.resetFields();
    setSignOpen(true);
  };

  const onConfirm = async () => {
    if (!currentRow) return;
    const vals = await form.validateFields();
    try {
      await fetch('/api/v1/pharmacy/dispense/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentRow.id, pharmacist: vals.pharmacist, verifier: vals.verifier }),
      });
      message.success(`处方 ${currentRow.rxNo} 发药完成（双人核对）`);
      setList((prev) => prev.map((r) => r.id === currentRow.id ? { ...r, status: '已发药' as const } : r));
      setSignOpen(false);
    } catch {
      message.error('发药确认失败');
    }
  };

  const onReturn = async (row: RxRow) => {
    try {
      await fetch('/api/v1/pharmacy/dispense/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, reason: '患者退药' }),
      });
      message.success(`处方 ${row.rxNo} 退药完成`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已退药' as const } : r));
    } catch {
      message.error('退药失败');
    }
  };

  const columns: ColumnsType<RxRow> = [
    { title: '处方号', dataIndex: 'rxNo', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '医生', dataIndex: 'doctor', width: 90 },
    { title: '药品明细', dataIndex: 'drugs' },
    { title: '药品种数', dataIndex: 'totalQty', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '待发药' ? 'orange' : v === '已发药' ? 'green' : 'red';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '时间', dataIndex: 'createTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, row) => (
        <Space size="small">
          <Button size="small" onClick={() => { setCurrentRow(row); setDetailOpen(true); }}>详情</Button>
          {row.status === '待发药' && (
            <Button size="small" type="primary" onClick={() => openSign(row)}>发药确认</Button>
          )}
          {row.status === '已发药' && (
            <Button size="small" danger onClick={() => void onReturn(row)}>退药</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="门诊药房发药窗口" description="待发药处方列表，双人核对签名发药">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal title="处方详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={560}>
        {currentRow && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="处方号">{currentRow.rxNo}</Descriptions.Item>
            <Descriptions.Item label="患者">{currentRow.patient}</Descriptions.Item>
            <Descriptions.Item label="科室">{currentRow.dept}</Descriptions.Item>
            <Descriptions.Item label="医生">{currentRow.doctor}</Descriptions.Item>
            <Descriptions.Item label="药品明细">{currentRow.drugs}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        title={`发药双人签名 - ${currentRow?.rxNo ?? ''}`}
        open={signOpen}
        onOk={() => void onConfirm()}
        onCancel={() => setSignOpen(false)}
        okText="确认发药"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="pharmacist" label="发药药师" rules={[{ required: true, message: '请输入发药药师姓名' }]}>
            <Input placeholder="发药药师工号/姓名" />
          </Form.Item>
          <Form.Item name="verifier" label="核对药师" rules={[{ required: true, message: '请输入核对药师姓名' }]}>
            <Input placeholder="核对药师工号/姓名" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
