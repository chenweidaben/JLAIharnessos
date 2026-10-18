/**
 * 健澜科技 jlmedaios - 病历质控数据导出中心前端页（M472-D，M472 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：导出任务列表（数据集/列数/状态徽章）+ 创建导出按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExportTask {
  id: string;
  dataset: string;
  columns: string[];
  status: "pending" | "processing" | "completed";
}

export default function EmrDataExportPage() {
  const [tasks, setTasks] = useState<ExportTask[]>([]);

  const handleCreate = () => {
    setTasks((prev) => [
      ...prev,
      {
        id: `EXP-${Date.now().toString(36)}`,
        dataset: "病历",
        columns: ["病历号", "患者姓名", "科室", "诊断", "质控得分", "缺陷数"],
        status: "pending",
      },
    ]);
  };

  const statusTag = (status: string) => {
    if (status === "pending") return <Tag color="orange">待处理</Tag>;
    if (status === "processing") return <Tag color="blue">处理中</Tag>;
    return <Tag color="green">已完成</Tag>;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控数据导出中心</Title>
        <Card style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent }} onClick={handleCreate}>
            + 创建导出任务
          </Button>
        </Card>
        <Card title="导出任务列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <List
            dataSource={tasks}
            renderItem={(item: ExportTask) => (
              <List.Item>
                {statusTag(item.status)}
                <Text strong style={{ marginLeft: 12 }}>{item.dataset}</Text>
                <Text type="secondary" style={{ marginLeft: 12 }}>
                  {item.columns.length} 列
                </Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
