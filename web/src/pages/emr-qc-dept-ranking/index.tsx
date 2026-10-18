/**
 * 健澜科技 jlmedaios - 质控科室排名前端页（M493-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室排名榜（前三名金/银/铜）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptRanking {
  dept: string;
  score: number;
  rank: number;
}

const rankColor: Record<number, string> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

const rankLabel: Record<number, string> = {
  1: "冠军",
  2: "亚军",
  3: "季军",
};

export default function EmrQcDeptRankingPage() {
  const [rankings, setRankings] = useState<DeptRanking[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-ranking", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRankings(data?.data?.rankings ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控科室排名榜</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室排名">
          <List
            dataSource={rankings}
            renderItem={(item) => (
              <List.Item>
                <Tag color={rankColor[item.rank] ?? "default"} style={{ width: 60, textAlign: "center" }}>
                  {rankLabel[item.rank] ?? `第${item.rank}名`}
                </Tag>
                <Text style={{ width: 120 }}>{item.dept}</Text>
                <Text strong>评分：{item.score}</Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
