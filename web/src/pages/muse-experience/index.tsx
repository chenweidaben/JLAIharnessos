/**
 * 健澜科技 jlmedaios - MUSE 个人经验沉淀闭环 V5 页（M275-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Experience {
  id: string;
  role: string;
  specialty: string;
  situation: string;
  lesson: string;
  upvotes: number;
  downvotes: number;
}

interface Result {
  total: number;
  avgScore: number;
  topExperiences: Experience[];
}

export default function MUSEExperiencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-experience");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>MUSE 个人经验沉淀闭环</Title>
        <Paragraph type="secondary">临床决策经验记录·评分·去重·跨角色复用</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="经验总数" value={data.total} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均质量分" value={data.avgScore} /></Card></Col>
              <Col span={8}><Card><Statistic title="TOP经验" value={data.topExperiences.length} /></Card></Col>
            </Row>
            <Card title="高分经验" style={{ marginTop: 16 }}>
              <List
                dataSource={data.topExperiences}
                renderItem={(e) => (
                  <List.Item>
                    <List.Item.Meta title={`[${e.specialty}] ${e.situation}`} description={e.lesson} />
                    <span>👍{e.upvotes} 👎{e.downvotes}</span>
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
