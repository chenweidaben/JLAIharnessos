/**
 * 健澜科技 jlmedaios - 质控任务签收前端页（M488-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：已派发任务列表 + 签收按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReceivedTask {
  taskId: string;
  status: string;
  receivedAt: string;
}

const dispatchedTasks = [
  { taskId: "T001", recordId: "MR001", reviewer: "张三" },
  { taskId: "T002", recordId: "MR002", reviewer: "李四" },
  { taskId: "T003", recordId: "MR003", reviewer: "王五" },
];

const columns = [
  { title: "任务号", dataIndex: "taskId", key: "taskId" },
  { title: "病历号", dataIndex: "recordId", key: "recordId" },
  { title: "质控员", dataIndex: "reviewer", key: "reviewer" },
  { title: "状态", key: "status", render: () => <Tag color="blue">已派发</Tag> },
  {
    title: "操作",
    key: "action",
    render: (_: unknown, record: { taskId: string; reviewer: string }) => (
      <ReceiveButton taskId={record.taskId} reviewer={record.reviewer} />
    ),
  },
];

function ReceiveButton({ taskId, reviewer }: { taskId: string; reviewer: string }) {
  const [received, setReceived] = useState<ReceivedTask | null>(null);

  const receive = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-task-receive", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ taskId, reviewer }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReceived(data?.received ?? null);
        message.success("签收成功");
      }
    } catch {
      message.error("签收失败");
    }
  };

  return received ? (
    <Tag color="green">{received.status}</Tag>
  ) : (
    <Button size="small" type="primary" onClick={receive} style={{ background: VI.accent }}>
      签收
    </Button>
  );
}

export default function EmrQcTaskReceivePage() {
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控任务签收</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="已派发任务">
          <Table columns={columns} dataSource={dispatchedTasks} rowKey="taskId" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
