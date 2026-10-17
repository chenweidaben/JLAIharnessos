/**
 * 健澜科技 jlmedaios - 任务验收与效果验证 V13 页（M307-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Task {
  taskId: string;
  title: string;
  expectedGain: number;
  beforeScore: number;
  afterScore: number;
  status: string;
}

interface Report {
  acceptedCount: number;
  rejectedCount: number;
  avgGain: number;
}

interface Resp {
  tasks: Task[];
  report: Report;
}

export default function TaskVerificationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/task-verification");
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
        <Title level={3} style={{ color: VI.deep }}>任务验收报告</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="通过 / 驳回" value={`${data.report.acceptedCount} / ${data.report.rejectedCount}`} />
              <Statistic title="平均净提升" value={data.report.avgGain} />
            </Card>
            <Card title="任务明细">
              <List
                dataSource={data.tasks}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.title}
                      description={`${it.beforeScore} → ${it.afterScore}（预期 +${it.expectedGain}）`}
                    />
                    <Tag color={it.status === "accepted" ? "green" : "red"}>{it.status}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
