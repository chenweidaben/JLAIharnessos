/**
 * 健澜科技 jlmedaios - 病历质控追溯审计日志前端页（M467-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：审计日志表格（病历号/操作人/规则/动作/时间）+ 筛选栏。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, Space, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AuditLog {
  id: string;
  noteId: string;
  operator: string;
  ruleId: string;
  action: string;
  timestamp?: string;
}

export default function EmrQcAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [noteIdFilter, setNoteIdFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = noteIdFilter
          ? `/api/v1/emr-qc-audit-log?noteId=${noteIdFilter}`
          : "/api/v1/emr-qc-audit-log";
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setLogs(data?.logs ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [noteIdFilter]);

  const columns = [
    { title: "日志ID", dataIndex: "id", key: "id" },
    { title: "病历号", dataIndex: "noteId", key: "noteId" },
    { title: "操作人", dataIndex: "operator", key: "operator" },
    { title: "规则ID", dataIndex: "ruleId", key: "ruleId" },
    { title: "动作", dataIndex: "action", key: "action", render: (v: string) => (v === "flagged" ? <Tag color="red">标记</Tag> : <Tag color="green">解决</Tag>) },
    { title: "时间", dataIndex: "timestamp", key: "timestamp" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控追溯审计日志</Title>
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="按病历号筛选，如 N001"
              value={noteIdFilter}
              onChange={(e) => setNoteIdFilter(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
          </Space>
        </Card>
        <Card title="审计日志列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={logs} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
