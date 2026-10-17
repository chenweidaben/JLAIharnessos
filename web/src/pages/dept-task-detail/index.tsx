/**
 * 健澜科技 jlmedaios - 科室任务详情与督办 V13 页（M308-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Checkbox, Layout, List, Spin, Tag, Timeline, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Sub {
  subItemId: string;
  label: string;
  done: boolean;
}

interface H {
  ts: string;
  action: string;
  actor: string;
}

interface Resp {
  task: { taskId: string; title: string; owner: string; dept: string; status: string; nudgeCount: number };
  subItems: Sub[];
  progress: number;
  history: H[];
}

export default function DeptTaskDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dept-task-detail/t1");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>任务详情</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Title level={4}>{data.task.title}</Title>
              <Tag color="blue">{data.task.dept}</Tag>
              <Tag color="orange">{data.task.owner}</Tag>
              <Tag color={data.task.status === "open" ? "orange" : "green"}>{data.task.status}</Tag>
              <Tag color="purple">进度 {data.progress}%</Tag>
            </Card>
            <Card title="子项 Checklist" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.subItems}
                renderItem={(it) => (
                  <List.Item>
                    <Checkbox checked={it.done} disabled>{it.label}</Checkbox>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="历史时间线">
              <Timeline
                items={data.history.map((h) => ({
                  children: `${h.ts} · ${h.action}（${h.actor}）`,
                }))}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
