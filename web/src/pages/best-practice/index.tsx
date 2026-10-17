/**
 * 健澜科技 jlmedaios - 成功案例蒸馏与最佳实践库 V10 页（M292-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PracticeRow {
  id: string;
  dept: string;
  condition: string;
  title: string;
  description: string;
  sourceCaseCnt: number;
  upvoteCnt: number;
}

interface Library {
  total: number;
  topDept: string;
  avgUpvote: number;
}

interface Result {
  list: PracticeRow[];
  library: Library;
}

export default function BestPracticePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/best-practice");
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
        <Title level={3} style={{ color: VI.deep }}>最佳实践库</Title>
        <Paragraph type="secondary">成功案例蒸馏·赞数排序·来源数</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!data || loading ? null : (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="实践总数" value={data.library.total} /></Card></Col>
              <Col span={8}><Card><Statistic title="产出最多科室" value={data.library.topDept} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均赞数" value={data.library.avgUpvote} /></Card></Col>
            </Row>
            <Card title="最佳实践列表（按赞数×2+来源数排序）" style={{ marginTop: 16 }}>
              <List
                dataSource={data.list}
                renderItem={(p) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`[${p.dept}·${p.condition}] ${p.title}`}
                      description={p.description}
                    />
                    <Tag color="green">赞×{p.upvoteCnt}</Tag>
                    <Tag color="blue">来源×{p.sourceCaseCnt}</Tag>
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
