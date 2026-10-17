/**
 * 健澜科技 jlmedaios - 专家经验贡献激励 V13 页（M298-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Entry {
  doctorId: string;
  name: string;
  score: number;
  badge: string;
}

const badgeColor: Record<string, string> = {
  "传家宝": "gold",
  "良师": "green",
  "分享者": "blue",
  "新人": "default",
};

export default function ContributionLeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Entry[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Entry[]>("/api/v1/contribution-leaderboard?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>专家经验贡献榜</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="Top 贡献者">
            <List
              dataSource={list}
              renderItem={(it, idx) => (
                <List.Item>
                  <List.Item.Meta
                    title={`#${idx + 1} ${it.name}`}
                    description={`贡献分 ${it.score}`}
                  />
                  <Tag color={badgeColor[it.badge] ?? "default"}>{it.badge}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
