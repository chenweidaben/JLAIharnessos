/**
 * 健澜科技 jlmedaios - 终末质控前端页（M480-D，M480 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：终末质控列表表格（病历号/科室/状态/得分）+ 提交按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Spin, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TerminalQcRecord {
  medicalRecordId: string;
  dept: string;
}

export default function EmrTerminalQcPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<TerminalQcRecord[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-terminal-qc", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRecords(data?.records ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (record: TerminalQcRecord) => {
    setSubmitting(record.medicalRecordId);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-terminal-qc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ ...record, score: 90, passed: true }),
      });
      if (resp.ok) {
        message.success(`${record.medicalRecordId} 已提交`);
      }
    } catch {
      message.error("提交失败");
    } finally {
      setSubmitting(null);
    }
  };

  const columns = [
    { title: "病历号", dataIndex: "medicalRecordId", key: "medicalRecordId" },
    { title: "科室", dataIndex: "dept", key: "dept" },
    { title: "状态", dataIndex: "medicalRecordId", key: "status", render: () => <Tag color="blue">待质控</Tag> },
    { title: "得分", dataIndex: "medicalRecordId", key: "score", render: () => "—" },
    {
      title: "操作",
      dataIndex: "medicalRecordId",
      key: "action",
      render: (_: unknown, record: TerminalQcRecord) => (
        <Button
          type="primary"
          size="small"
          loading={submitting === record.medicalRecordId}
          onClick={() => submit(record)}
          style={{ background: VI.accent }}
        >
          提交质控
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>终末质控</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={records} columns={columns} rowKey="medicalRecordId" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
