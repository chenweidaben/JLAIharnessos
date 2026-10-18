/**
 * 健澜科技 jlmedaios - 病历科室质控排行榜前端页（M470-B，V14，EMR 深化四模块，-board 后缀避让）
 *
 * 深海蓝VI：排行榜（金银铜名次 + 升降徽章 ↑↓→）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RankedDept {
  name: string;
  score: number;
  rank: number;
  trend: "up" | "down" | "same";
}

export default function EmrQcRankingBoardPage() {
  const [loading, setLoading] = useState(true);
  const [ranked, setRanked] = useState<RankedDept[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-ranking-board?period=month", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRanked(data?.ranked ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rankColor = (rank: number) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "orange";
    return "default";
  };

  const trendTag = (trend: "up" | "down" | "same") => {
    if (trend === "up") return <Tag color="green">↑ 上升</Tag>;
    if (trend === "down") return <Tag color="red">↓ 下降</Tag>;
    return <Tag color="default">→ 持平</Tag>;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历科室质控排行榜</Title>
        <Card title="本月排行榜（降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              dataSource={ranked}
              renderItem={(item: RankedDept) => (
                <List.Item>
                  <Tag color={rankColor(item.rank)} style={{ fontSize: 14, minWidth: 48, textAlign: "center" }}>
                    第 {item.rank} 名
                  </Tag>
                  <Text strong style={{ marginLeft: 16 }}>{item.name}</Text>
                  <Text type="secondary" style={{ marginLeft: 16 }}>得分：{item.score}</Text>
                  <span style={{ marginLeft: 16 }}>{trendTag(item.trend)}</span>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
