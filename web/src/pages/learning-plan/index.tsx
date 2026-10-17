/**
 * 健澜科技 jlmedaios - 交接后继任者学习计划 V13 页（M297-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Progress, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Item {
  experienceId: string;
  title: string;
  bucket: "fresh" | "aging" | "stale" | "archive";
  transferability: number;
  studied: boolean;
}

interface Plan {
  handoverId: string;
  items: Item[];
  totalMinutes: number;
  studiedCount: number;
}

export default function LearningPlanPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Plan>("/api/v1/learning-plan?handoverId=pkg-zhang-li");
        if (!cancelled) setPlan(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>继任者学习计划</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && plan && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Progress
                percent={plan.items.length === 0 ? 0 : Math.round((plan.studiedCount / plan.items.length) * 100)}
              />
              <Statistic title="预估总时长（分钟）" value={plan.totalMinutes} style={{ marginTop: 16 }} />
            </Card>
            <Card title="阅读清单（按新鲜度+可迁移分排序）">
              <List
                dataSource={plan.items}
                renderItem={(it) => (
                  <List.Item
                    actions={[
                      it.studied
                        ? <Tag key="s" color="green">已学</Tag>
                        : <Button key="m" size="small" type="primary">标记已学</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={it.title}
                      description={`可迁移分 ${it.transferability}`}
                    />
                    <Tag color={it.bucket === "fresh" ? "green" : it.bucket === "stale" ? "orange" : "blue"}>
                      {it.bucket}
                    </Tag>
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
