/**
 * 健澜科技 jlmedaios - 模板版本审核工作流前端页（M461-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：待审列表（pending_review 高亮）+ 批准/驳回按钮。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, message, Spin, Table, Tag, Typography } from "antd";
import type { ReviewRecordV14 } from "@/bff/aggregators/emrTemplateReviewV14Aggregator";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending_review: { label: "待审核", color: "orange" },
  approved: { label: "已批准", color: "green" },
  rejected: { label: "已驳回", color: "red" },
};

export default function EmrTemplateReviewPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRecordV14[]>([]);

  const fetchList = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-review", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setReviews(data?.reviews ?? []);
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

  const handleAction = async (record: ReviewRecordV14, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch(`/api/v1/emr-template-review/${record.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ action, reviewer: "当前用户" }),
      });
      if (resp.ok) {
        message.success(`${action === "approve" ? "批准" : "驳回"}成功`);
        void fetchList();
      } else {
        message.warning("操作失败");
      }
    } catch {
      message.warning("操作失败（后端 route 未就绪）");
    }
  };

  const columns = [
    { title: "模板", dataIndex: "templateName", key: "templateName" },
    { title: "版本", dataIndex: "version", key: "version" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const meta = STATUS_META[status] ?? { label: status, color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: "提交人", dataIndex: "submitter", key: "submitter" },
    { title: "提交时间", dataIndex: "submittedAt", key: "submittedAt" },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: ReviewRecordV14) =>
        record.status === "pending_review" ? (
          <Button.Group>
            <Button size="small" type="primary" onClick={() => handleAction(record, "approve")}>批准</Button>
            <Button size="small" danger onClick={() => handleAction(record, "reject")}>驳回</Button>
          </Button.Group>
        ) : (
          <span>—</span>
        ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>模板版本审核工作流</Title>
        <Card title="待审核列表" headStyle={{ background: VI.deep, color: "#fff" }} loading={loading}>
          <Table rowKey="id" columns={columns} dataSource={reviews} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
