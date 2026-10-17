/**
 * 健澜科技 jlmedaios - 过期经验复核工作流 V13 页（M296-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Task {
  taskId: string;
  experienceId: string;
  title: string;
  monthsAgo: number;
  author: string;
  status: "pending" | "confirmed" | "archived";
}

interface Summary {
  pendingCount: number;
  overdueCount: number;
}

interface Resp {
  tasks: Task[];
  summary: Summary;
}

export default function ExperienceReviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/experience-review");
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
        <Title level={3} style={{ color: VI.deep }}>过期经验复核</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={12}><Card><Statistic title="待复核" value={data.summary.pendingCount} /></Card></Col>
              <Col span={12}><Card><Statistic title="超期" value={data.summary.overdueCount} /></Card></Col>
            </Row>
            <Card title="任务队列" style={{ marginTop: 16 }}>
              <List
                dataSource={data.tasks}
                renderItem={(t) => (
                  <List.Item
                    actions={[
                      <Button key="c" size="small" type="primary">确认仍有效</Button>,
                      <Button key="a" size="small" danger>标记过时</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={t.title}
                      description={`${t.author} · ${t.monthsAgo} 月前`}
                    />
                    {t.monthsAgo > 30 && <Tag color="red">overdue</Tag>}
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
