/**
 * 健澜科技 jlmedaios - 个人学习曲线里程碑 V13 页（M309-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BoardItem {
  doctorId: string;
  name: string;
  score: number;
  badges: string[];
  milestone: string;
}

interface Awarded {
  doctorId: string;
  badge: { badgeName: string; unlockedAt: string };
}

interface Resp {
  board: BoardItem[];
  awarded: Awarded[];
}

export default function LearningMilestonePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/learning-milestone?doctorId=d1");
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
        <Title level={3} style={{ color: VI.deep }}>学习里程碑</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title="医生徽章墙（按徽章数降序）">
            <List
              dataSource={data.board}
              renderItem={(it, idx) => (
                <List.Item>
                  <List.Item.Meta
                    title={`#${idx + 1} ${it.name}（${it.score} 分）`}
                    description={it.badges.map((b) => <Tag key={b} color="blue">{b}</Tag>)}
                  />
                  <Tag color={it.milestone === "专家" ? "gold" : "orange"}>{it.milestone}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
