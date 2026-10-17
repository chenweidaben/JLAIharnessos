/**
 * 健澜科技 jlmedaios - 飞轮改进任务闭环 V13 页（M307-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Task {
  taskId: string;
  title: string;
  owner: string;
  deadline: string;
  expectedGain: number;
  status: string;
  completedSubItems: number;
  totalSubItems: number;
  progress: number;
}

export default function FlywheelTasksPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Task[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Task[]>("/api/v1/flywheel-tasks");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>飞轮改进任务</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="任务清单（owner + 14天倒计时 + 进度）">
            <List
              dataSource={list}
              renderItem={(it) => (
                <List.Item>
                  <List.Item.Meta
                    title={it.title}
                    description={`owner: ${it.owner} · 截止 ${it.deadline} · 预计 +${it.expectedGain}`}
                  />
                  <Tag color={it.status === "done" ? "green" : "orange"}>{it.status}</Tag>
                  <Tag color="blue">进度 {it.progress}%</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
