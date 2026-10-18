/**
 * 健澜科技 jlmedaios - 病历缺陷反馈与整改闭环前端页（M464-D，V14，EMR 深化四模块，M464 收官）
 *
 * 深海蓝VI：缺陷→整改→复核闭环表（缺陷描述/整改人/状态徽章 open/resolving/closed）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Badge, Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FeedbackRecord {
  feedbackId: string;
  defectId: string;
  noteId: string;
  writer: string;
  feedback: string;
  status: "open" | "resolving" | "closed";
  createdAt: string;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  open: { color: "red", label: "待整改" },
  resolving: { color: "orange", label: "整改中" },
  closed: { color: "green", label: "已闭环" },
};

export default function EmrDefectFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-defect-feedback/demo001", {
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

  const columns = [
    { title: "反馈号", dataIndex: "feedbackId", key: "feedbackId" },
    { title: "缺陷号", dataIndex: "defectId", key: "defectId" },
    { title: "整改人", dataIndex: "writer", key: "writer" },
    { title: "整改说明", dataIndex: "feedback", key: "feedback" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const meta = STATUS_META[status] ?? { label: status, color: "default" };
        return <Badge color={meta.color} text={<Tag color={meta.color}>{meta.label}</Tag>} />;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历缺陷反馈与整改闭环</Title>
        <Card title="缺陷→整改→复核闭环表" headStyle={{ background: VI.deep, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table rowKey="feedbackId" columns={columns} dataSource={records} pagination={false} size="small" />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
