/**
 * 健澜科技 jlmedaios - 经验推送频控与免打扰 V13 页（M295-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PushItem {
  experienceId: string;
  title: string;
  category: string;
  score: number;
}

interface PushResult {
  targetRole: string;
  top: PushItem[];
  folded: PushItem[];
  digestText: string;
}

export default function ExperiencePushPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PushResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<PushResult>("/api/v1/experience-push?targetRole=nurse");
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
        <Title level={3} style={{ color: VI.deep }}>今日经验推送</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="已推送" bordered={false}>
              <List
                dataSource={data.top}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} description={`分类=${it.category}`} />
                    <Tag color="green">{it.score}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            {data.folded.length > 0 && (
              <Card style={{ marginTop: 16 }}>
                <Paragraph type="secondary">{data.digestText}</Paragraph>
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
