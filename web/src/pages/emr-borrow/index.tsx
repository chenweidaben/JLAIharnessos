/**
 * 健澜科技 jlmedaios - 病历借阅复印管理前端页（M462-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：借阅申请表（患者/病历号/借阅事由）+ 记录列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, message, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BorrowRecord {
  id: string;
  patientName: string;
  medicalRecordNumber: string;
  status: "available" | "borrowed" | "returned";
  appliedAt?: string;
  dueDate?: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  available: { label: "可借阅", color: "green" },
  borrowed: { label: "已借出", color: "orange" },
  returned: { label: "已归还", color: "blue" },
};

export default function EmrBorrowPage() {
  const [form] = Form.useForm();
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-borrow", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setRecords(data?.records ?? []);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const handleApply = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(values),
      });
      if (resp.ok) {
        message.success("借阅申请已提交");
        form.resetFields();
        void fetchList();
      } else {
        message.warning("申请失败（后端 route 未就绪）");
      }
    } catch {
      // graceful
    }
  };

  const columns = [
    { title: "患者", dataIndex: "patientName", key: "patientName" },
    { title: "病历号", dataIndex: "medicalRecordNumber", key: "medicalRecordNumber" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const meta = STATUS_META[status] ?? { label: status, color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: "申请时间", dataIndex: "appliedAt", key: "appliedAt", render: (v: string) => v ?? "—" },
    { title: "应还日期", dataIndex: "dueDate", key: "dueDate", render: (v: string) => v ?? "—" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历借阅复印管理</Title>
        <Card title="借阅申请" headStyle={{ background: VI.deep, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Form form={form} layout="inline">
            <Form.Item name="patientName" label="患者" rules={[{ required: true }]}>
              <Input placeholder="患者姓名" />
            </Form.Item>
            <Form.Item name="medicalRecordNumber" label="病历号" rules={[{ required: true }]}>
              <Input placeholder="如 ZY20261001001" />
            </Form.Item>
            <Form.Item name="reason" label="借阅事由">
              <Input placeholder="如 复印病历用于保险" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} onClick={handleApply}>提交申请</Button>
            </Form.Item>
          </Form>
        </Card>
        <Card title="借阅记录列表" headStyle={{ background: VI.mid, color: "#fff" }} loading={loading}>
          <Table rowKey="id" columns={columns} dataSource={records} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
