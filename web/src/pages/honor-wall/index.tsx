/**
 * 健澜科技 jlmedaios - 贡献荣誉墙与月度之星 V13 页（M298-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
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

interface Wall {
  top3: Entry[];
  rest: Entry[];
  monthlyStar: Entry | null;
  trendDelta: number;
}

export default function HonorWallPage() {
  const [loading, setLoading] = useState(true);
  const [wall, setWall] = useState<Wall | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Wall>("/api/v1/honor-wall");
        if (!cancelled) setWall(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>贡献荣誉墙</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && wall && (
          <>
            <Row gutter={16}>
              {wall.top3.map((it, idx) => (
                <Col span={8} key={it.doctorId}>
                  <Card title={`#${idx + 1} ${it.name}`}>
                    <Statistic title="贡献分" value={it.score} />
                    <Tag color="gold" style={{ marginTop: 8 }}>{it.badge}</Tag>
                  </Card>
                </Col>
              ))}
            </Row>
            <Card title="月度之星" style={{ marginTop: 16 }}>
              {wall.monthlyStar
                ? <Tag color="gold">⭐ {wall.monthlyStar.name}（{wall.monthlyStar.score} 分）</Tag>
                : <Tag>本月无新人当选</Tag>}
              <Statistic
                title="环比增长"
                value={wall.trendDelta}
                suffix="分"
                style={{ marginTop: 16 }}
              />
            </Card>
            <Card title="其他贡献者" style={{ marginTop: 16 }}>
              <List
                dataSource={wall.rest}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.name} description={`${it.score} 分`} />
                    <Tag>{it.badge}</Tag>
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
