/**
 * 健澜科技 jlmedaios - 评审专家资质与激励 V13 页（M299-C）
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
  reviewCount: number;
}

export default function ReviewerRosterPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Entry[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Entry[]>("/api/v1/reviewer-roster");
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
        <Title level={3} style={{ color: VI.deep }}>评审专家名册</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="合格评审专家（贡献分≥50）">
            <List
              dataSource={list}
              renderItem={(it) => (
                <List.Item>
                  <List.Item.Meta
                    title={it.name}
                    description={`贡献分 ${it.score} · 已审 ${it.reviewCount} 条`}
                  />
                  <Tag color="blue">评审专家</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
