/**
 * 健澜科技 jlmedaios - 经验质量同行评审 V13 页（M299-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Rate, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Review {
  reviewerId: string;
  score: number;
  comment: string;
}

interface Exp {
  experienceId: string;
  title: string;
  dept: string;
  author: string;
  status: "pending" | "approved" | "rejected";
  reviews: Review[];
}

export default function ReviewQueuePage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Exp[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Exp[]>("/api/v1/review-queue?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>待审经验队列</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card>
            <List
              dataSource={list}
              renderItem={(it) => (
                <List.Item
                  actions={[
                    <Rate key="rate" />,
                    <Input key="comment" placeholder="评语" style={{ width: 200 }} />,
                    <Button key="submit" type="primary">提交评审</Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={`${it.title}（${it.author}）`}
                    description={`${it.dept} · 已有 ${it.reviews.length} 条评审`}
                  />
                  <Tag color={it.status === "approved" ? "green" : it.status === "rejected" ? "red" : "orange"}>
                    {it.status}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
