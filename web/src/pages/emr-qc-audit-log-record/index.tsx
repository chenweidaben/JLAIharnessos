/**
 * 健澜科技 jlmedaios - 质控操作日志审计记录前端页（M498-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：操作日志审计列表（操作人/操作/时间）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AuditLog {
  user: string;
  action: string;
  time: string;
}

export default function EmrQcAuditLogRecordPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-audit-log-record", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLogs(data?.data?.logs ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const search = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const url = keyword
        ? `/api/v1/emr-qc-audit-log-record?keyword=${encodeURIComponent(keyword)}`
        : "/api/v1/emr-qc-audit-log-record";
      const resp = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setLogs(data?.data?.logs ?? []);
      }
    } catch {
      message.error("搜索失败");
    }
  };

  const columns = [
    { title: "操作人", dataIndex: "user", key: "user" },
    { title: "操作", dataIndex: "action", key: "action" },
    { title: "时间", dataIndex: "time", key: "time" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控操作日志审计</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 300 }}
            placeholder="输入关键词搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={search}
            addonAfter={<a onClick={search}>搜索</a>}
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="操作日志列表">
          <Table columns={columns} dataSource={logs} rowKey="time" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
