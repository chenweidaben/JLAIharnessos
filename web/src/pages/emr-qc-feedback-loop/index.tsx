/**
 * 健澜科技 jlmedaios - 质控问题反馈闭环前端页（M496-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：反馈闭环状态跟踪表（问题/状态 Tag 待处理/整改中/已闭环）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Statistic, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FeedbackRecord {
  issue: string;
  status: string;
}

interface Tracking {
  total: number;
  closed: number;
  rate: number;
}

const statusColor: Record<string, string> = {
  待处理: "default",
  整改中: "gold",
  已闭环: "green",
};

export default function EmrQcFeedbackLoopPage() {
  const [records, setRecords] = useState<FeedbackRecord[]>([
    { issue: "缺主诉", status: "整改中" },
    { issue: "超时限", status: "已闭环" },
    { issue: "用词不规范", status: "已闭环" },
  ]);
  const [newIssue, setNewIssue] = useState("");
  const [tracking, setTracking] = useState<Tracking | null>(null);

  const submit = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-feedback-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ issue: newIssue, status: "待处理" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setRecords((prev) => [...prev, data?.data?.record ?? { issue: newIssue, status: "待处理" }]);
        setTracking(data?.data?.tracking ?? null);
        message.success("反馈提交完成");
        setNewIssue("");
      }
    } catch {
      message.error("反馈提交失败");
    }
  };

  const columns = [
    { title: "问题", dataIndex: "issue", key: "issue" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag color={statusColor[status] ?? "default"}>{status}</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控问题反馈闭环</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 300 }}
            placeholder="输入质控问题"
            value={newIssue}
            onChange={(e) => setNewIssue(e.target.value)}
          />
          <Button type="primary" onClick={submit} style={{ background: VI.accent, marginLeft: 16 }}>
            提交反馈
          </Button>
        </Card>
        {tracking && (
          <Card style={{ marginBottom: 16 }}>
            <Statistic title="总反馈数" value={tracking.total} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="已闭环" value={tracking.closed} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="闭环率" value={tracking.rate} suffix="%" style={{ display: "inline-block" }} />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="反馈闭环状态跟踪表">
          <Table columns={columns} dataSource={records} rowKey="issue" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
