/**
 * 健澜科技 jlmedaios - 病历审核工作流前端页（M478-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：审核流程步骤条（待审→审核中→已通过/已驳回）+ 状态流转按钮（提交/通过/驳回）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Steps, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const statusToStep: Record<string, number> = {
  pending: 0,
  reviewing: 1,
  approved: 2,
  rejected: 2,
};

export default function EmrReviewWorkflowPage() {
  const [currentStatus, setCurrentStatus] = useState("pending");

  const transition = async (action: string) => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-review-workflow/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ currentStatus, action }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCurrentStatus(data?.newStatus ?? currentStatus);
        message.success(`状态已流转为 ${data?.newStatus ?? currentStatus}`);
      }
    } catch {
      message.error("请求失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历审核工作流</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Steps current={statusToStep[currentStatus] ?? 0} items={[
            { title: "待审" },
            { title: "审核中" },
            { title: currentStatus === "rejected" ? "已驳回" : "已通过" },
          ]} />
        </Card>
        <Card title="当前状态" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Tag color={currentStatus === "approved" ? "green" : currentStatus === "rejected" ? "red" : "blue"} style={{ fontSize: 14, padding: 8 }}>
            {currentStatus}
          </Tag>
        </Card>
        <Card title="状态流转操作" headStyle={{ background: VI.mid, color: "#fff" }}>
          {currentStatus === "pending" && (
            <Button type="primary" onClick={() => transition("submit")} style={{ background: VI.accent, marginRight: 8 }}>
              提交审核
            </Button>
          )}
          {currentStatus === "reviewing" && (
            <>
              <Button type="primary" onClick={() => transition("approve")} style={{ background: "#52c41a", marginRight: 8 }}>
                通过
              </Button>
              <Button danger onClick={() => transition("reject")}>
                驳回
              </Button>
            </>
          )}
          {(currentStatus === "approved" || currentStatus === "rejected") && (
            <Text type="secondary">流程已结束</Text>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
