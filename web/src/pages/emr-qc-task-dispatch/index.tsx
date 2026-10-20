/**
 * 健澜科技 jlmedaios - 质控任务派发前端页（M488-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：待派发病历列表 + 派发表单（病历号+质控员选择）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Select, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AssignedTask {
  recordId: string;
  reviewer: string;
  status: string;
  assignedAt: string;
}

const pendingRecords = [
  { recordId: "MR001", dept: "内科" },
  { recordId: "MR002", dept: "外科" },
  { recordId: "MR003", dept: "妇产科" },
];

const columns = [
  { title: "病历号", dataIndex: "recordId", key: "recordId" },
  { title: "科室", dataIndex: "dept", key: "dept" },
  { title: "状态", key: "status", render: () => <Tag color="orange">待派发</Tag> },
];

export default function EmrQcTaskDispatchPage() {
  const [recordId, setRecordId] = useState("MR001");
  const [reviewer, setReviewer] = useState("张三");
  const [assigned, setAssigned] = useState<AssignedTask | null>(null);

  const dispatch = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-task-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ recordId, reviewer }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAssigned(data?.assigned ?? null);
        message.success("派发成功");
      }
    } catch {
      message.error("派发失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控任务派发</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="待派发病历">
          <Table columns={columns} dataSource={pendingRecords} rowKey="recordId" pagination={false} />
        </Card>
        <Card style={{ marginTop: 16 }} title="派发表单">
          <Input placeholder="病历号" value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ marginBottom: 16 }} />
          <Select
            value={reviewer}
            onChange={setReviewer}
            style={{ width: "100%", marginBottom: 16 }}
            options={[
              { value: "张三", label: "张三（内科）" },
              { value: "李四", label: "李四（外科）" },
              { value: "王五", label: "王五（妇产科）" },
            ]}
          />
          <Button type="primary" onClick={dispatch} style={{ background: VI.accent }}>
            派发
          </Button>
        </Card>
        {assigned && (
          <Card style={{ marginTop: 16 }}>
            <Typography.Text>
              病历号 {assigned.recordId} 已派发给 {assigned.reviewer}，状态：{assigned.status}
            </Typography.Text>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
