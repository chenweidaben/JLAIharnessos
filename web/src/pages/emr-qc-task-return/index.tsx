/**
 * 健澜科技 jlmedaios - 质控任务退回前端页（M488-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：退回原因输入 + 退回列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReturnedTask {
  taskId: string;
  status: string;
  reason: string;
}

export default function EmrQcTaskReturnPage() {
  const [taskId, setTaskId] = useState("T001");
  const [reason, setReason] = useState("");
  const [returned, setReturned] = useState<ReturnedTask | null>(null);

  const doReturn = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-task-return", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ taskId, reason, reviewer: "张三" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReturned(data?.returned ?? null);
        message.success("退回成功");
      }
    } catch {
      message.error("退回失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控任务退回</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <Input placeholder="任务号" value={taskId} onChange={(e) => setTaskId(e.target.value)} style={{ marginBottom: 16 }} />
          <TextArea
            rows={3}
            placeholder="退回原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={doReturn} style={{ background: VI.accent }}>
            退回
          </Button>
        </Card>
        {returned && (
          <Card style={{ marginTop: 16 }}>
            <List
              dataSource={[returned]}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text style={{ marginRight: 16 }}>任务号 {item.taskId}</Typography.Text>
                  <Tag color="red">{item.status}</Tag>
                  <Typography.Text style={{ marginLeft: 16 }}>原因：{item.reason}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
