/**
 * 健澜AI原生医院操作系统OS - 医嘱双人核对页
 * 待核对医嘱列表 + 核对签名弹窗
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface VerifyRow {
  id: string;
  orderNo: string;
  patient: string;
  bedNo: string;
  item: string;
  dosage: string;
  frequency: string;
  doctor: string;
  dept: string;
  createTime: string;
}

const demoRows: VerifyRow[] = [
  { id: '1', orderNo: 'ORD-20261103-001', patient: '张三', bedNo: '呼吸科-12床', item: '0.9%氯化钠注射液', dosage: '250ml', frequency: '静滴 qd', doctor: '李医生', dept: '呼吸内科', createTime: '2026-11-03 08:30' },
  { id: '2', orderNo: 'ORD-20261103-002', patient: '王五', bedNo: '心内科-08床', item: '注射用头孢呋辛钠', dosage: '1.5g', frequency: '静滴 bid', doctor: '赵医生', dept: '心血管内科', createTime: '2026-11-03 09:15' },
  { id: '3', orderNo: 'ORD-20261103-003', patient: '刘六', bedNo: '消化科-21床', item: '奥美拉唑肠溶胶囊', dosage: '20mg', frequency: '口服 bid', doctor: '陈医生', dept: '消化内科', createTime: '2026-11-03 09:45' },
];

export default function OrderVerificationPage() {
  usePageTitle('医嘱双人核对');
  const [list, setList] = useState<VerifyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<VerifyRow | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/orders/pending-verify')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.orders ?? [];
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

  const openVerify = (row: VerifyRow) => {
    setCurrentRow(row);
    form.resetFields();
    setModalOpen(true);
  };

  const onSubmit = async () => {
    if (!currentRow) return;
    const vals = await form.validateFields();
    try {
      await fetch(`/api/v1/orders/${currentRow.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifier: vals.verifier, sign: vals.sign }),
      });
      message.success(`医嘱 ${currentRow.orderNo} 双人核对完成`);
      setList((prev) => prev.filter((r) => r.id !== currentRow.id));
      setModalOpen(false);
    } catch {
      message.error('核对提交失败，请重试');
    }
  };

  const columns: ColumnsType<VerifyRow> = [
    { title: '医嘱号', dataIndex: 'orderNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '床号', dataIndex: 'bedNo', width: 120 },
    { title: '项目', dataIndex: 'item' },
    { title: '剂量', dataIndex: 'dosage', width: 90 },
    { title: '频次', dataIndex: 'frequency', width: 110 },
    { title: '开立医生', dataIndex: 'doctor', width: 90 },
    { title: '科室', dataIndex: 'dept', width: 110 },
    { title: '开立时间', dataIndex: 'createTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => openVerify(row)}>双人核对</Button>
      ),
    },
  ];

  return (
    <PageContainer title="医嘱双人核对" description="待核对医嘱列表，双人核对签名后方可执行">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title={`医嘱核对签名 - ${currentRow?.orderNo ?? ''}`}
        open={modalOpen}
        onOk={() => void onSubmit()}
        onCancel={() => setModalOpen(false)}
        okText="确认核对"
        cancelText="取消"
      >
        {currentRow && (
          <div style={{ marginBottom: 16 }}>
            <p>患者：{currentRow.patient}（{currentRow.bedNo}）</p>
            <p>医嘱：{currentRow.item} {currentRow.dosage} {currentRow.frequency}</p>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="verifier" label="核对护士姓名" rules={[{ required: true, message: '请输入核对护士姓名' }]}>
            <Input placeholder="请输入核对护士工号或姓名" />
          </Form.Item>
          <Form.Item name="sign" label="电子签名" rules={[{ required: true, message: '请输入签名' }]}>
            <Input.Password placeholder="请输入签名密码" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
