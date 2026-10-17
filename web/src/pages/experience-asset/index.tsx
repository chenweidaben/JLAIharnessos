/**
 * 健澜科技 jlmedaios - 经验资产运营与退役 V13 页（M305-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ScoreItem {
  experienceId: string;
  title: string;
  score: number;
  stale: boolean;
}

interface Resp {
  scores: ScoreItem[];
}

export default function ExperienceAssetPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/experience-asset?doctorId=dr-001");
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
        <Title level={3} style={{ color: VI.deep }}>经验资产榜</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title="资产价值分 + 退役建议">
            <List
              dataSource={data.scores}
              renderItem={(it) => (
                <List.Item>
                  <List.Item.Meta
                    title={it.title}
                    description={`资产分 ${it.score}`}
                  />
                  {it.stale
                    ? <Tag color="default">待退役</Tag>
                    : <Tag color="green">活跃</Tag>}
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
