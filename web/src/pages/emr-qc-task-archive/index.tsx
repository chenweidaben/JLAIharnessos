/**
 * 健澜科技 jlmedaios - 质控任务归档前端页（M488-D，M488 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：已完成任务列表 + 归档按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchivedTask {
  taskId: string;
  status: string;
  archivedAt: string;
}

const completedTasks = [
  { taskId: "T001", recordId: "MR001", reviewer: "张三", result: "合格" },
  { taskId: "T002", recordId: "MR002", reviewer: "李四", result: "整改后合格" },
  { taskId: "T003", recordId: "MR003", reviewer: "王五", result: "合格" },
];

const columns = [
  { title: "任务号", dataIndex: "taskId", key: "taskId" },
  { title: "病历号", dataIndex: "recordId", key: "recordId" },
  { title: "质控员", dataIndex: "reviewer", key: "reviewer" },
  { title: "结果", dataIndex: "result", key: "result" },
  { title: "状态", key: "status", render: () => <Tag color="green">已完成</Tag> },
  {
    title: "操作",
    key: "action",
    render: (_: unknown, record: { taskId: string; reviewer: string; result: string }) => (
      <ArchiveButton taskId={record.taskId} reviewer={record.reviewer} result={record.result} />
    ),
  },
];

function ArchiveButton({ taskId, reviewer, result }: { taskId: string; reviewer: string; result: string }) {
  const [archived, setArchived] = useState<ArchivedTask | null>(null);

  const archive = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-task-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ taskId, reviewer, result }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setArchived(data?.archived ?? null);
        message.success("归档成功");
      }
    } catch {
      message.error("归档失败");
    }
  };

  return archived ? (
    <Tag color="blue">{archived.status}</Tag>
  ) : (
    <Button size="small" type="primary" onClick={archive} style={{ background: VI.accent }}>
      归档
    </Button>
  );
}

export default function EmrQcTaskArchivePage() {
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控任务归档</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="已完成任务">
          <Table columns={columns} dataSource={completedTasks} rowKey="taskId" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
