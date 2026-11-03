/**
 * 健澜AI原生医院操作系统OS - 麻醉术前访视工作台
 * 待访视手术列表 + 访视表单（ASA分级/气道评估/麻醉方案）+ 提交
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Select, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface VisitRow {
  id: string;
  patientName: string;
  gender: string;
  age: number;
  surgeryName: string;
  surgeryTime: string;
  dept: string;
  bedNo: string;
  status: string;
}

const demoRows: VisitRow[] = [
  { id: 'PREOP-20261104-001', patientName: '张**', gender: '男', age: 52, surgeryName: '腹腔镜胆囊切除术', surgeryTime: '2026-11-04 14:00', dept: '普外科', bedNo: '普外-12床', status: 'pending-visit' },
  { id: 'PREOP-20261104-002', patientName: '李**', gender: '女', age: 63, surgeryName: '全髋关节置换术', surgeryTime: '2026-11-04 15:30', dept: '骨科', bedNo: '骨科-08床', status: 'pending-visit' },
  { id: 'PREOP-20261104-003', patientName: '王**', gender: '男', age: 45, surgeryName: '经尿道前列腺电切术', surgeryTime: '2026-11-04 16:00', dept: '泌尿外科', bedNo: '泌尿-21床', status: 'pending-visit' },
];

const asaOptions = ['I', 'II', 'III', 'IV', 'V', 'VI'].map((v) => ({ value: v, label: `ASA ${v} 级` }));

export default function AnesthesiaPreopVisitPage() {
  usePageTitle('麻醉术前访视');
  const [list, setList] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<VisitRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/anesthesia/preop/pending')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.items ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
      })
      .catch((e: Error) => { if (!alive) return; setError(e.message); setList(demoRows); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openVisit = (row: VisitRow) => {
    setCurrent(row);
    form.resetFields();
    setOpen(true);
  };

  const onSubmit = async () => {
    if (!current) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await fetch(`/api/v1/anesthesia/preop/${current.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      message.success(`患者 ${current.patientName} 术前访视记录已提交`);
      setList((prev) => prev.filter((r) => r.id !== current.id));
      setOpen(false);
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return; // 表单校验未过
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<VisitRow> = [
    { title: '访视单号', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patientName', width: 80 },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60 },
    { title: '拟施手术', dataIndex: 'surgeryName' },
    { title: '科室', dataIndex: 'dept', width: 110 },
    { title: '床号', dataIndex: 'bedNo', width: 110 },
    { title: '手术时间', dataIndex: 'surgeryTime', width: 160 },
    {
      title: '操作', key: 'action', width: 120,
      render: (_, row) => <Button size="small" type="primary" onClick={() => openVisit(row)}>开始访视</Button>,
    },
  ];

  return (
    <PageContainer title="麻醉术前访视" description="待访视手术列表，记录病史/过敏史/ASA分级/气道评估与麻醉方案">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title={`术前访视 - ${current?.patientName ?? ''}（${current?.surgeryName ?? ''}）`}
        open={open}
        width={680}
        onOk={() => void onSubmit()}
        onCancel={() => setOpen(false)}
        okText="提交访视记录"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ asaLevel: 'II' }}>
          <Form.Item label="既往病史" name="history" rules={[{ required: true, message: '请填写既往病史' }]}>
            <Input.TextArea rows={3} placeholder="高血压/糖尿病/冠心病/手术麻醉史等" />
          </Form.Item>
          <Form.Item label="过敏史" name="allergyHistory" rules={[{ required: true, message: '请填写过敏史' }]}>
            <Input.TextArea rows={2} placeholder="药物/食物过敏史，无则填否认" />
          </Form.Item>
          <Form.Item label="ASA 分级" name="asaLevel" rules={[{ required: true, message: '请选择 ASA 分级' }]}>
            <Select options={asaOptions} placeholder="选择 ASA 分级" />
          </Form.Item>
          <Form.Item label="气道评估" name="airwayAssessment" rules={[{ required: true, message: '请填写气道评估' }]}>
            <Input.TextArea rows={2} placeholder="Mallampati 分级/张口度/颈部活动度/插管难度预判" />
          </Form.Item>
          <Form.Item label="麻醉方案" name="anesthesiaPlan" rules={[{ required: true, message: '请填写麻醉方案' }]}>
            <Input.TextArea rows={2} placeholder="麻醉方式/诱导维持用药/术后镇痛方案" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
