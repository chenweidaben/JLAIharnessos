/**
 * 健澜科技 jlmedaios - 处方点评与药师反馈 V7 页（M289-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReviewRow {
  prescriptionId: string;
  reviewer: string;
  result: "合理" | "不合理";
  comment: string;
}

interface RankRow {
  dept: string;
  rationalRate: number;
  rank: number;
}

interface Result {
  overallRate: number;
  deptRanking: RankRow[];
}

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [ranking, setRanking] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [r, k] = await Promise.all([
          get<ReviewRow[]>("/api/v1/review/prescriptions"),
          get<Result>("/api/v1/review/ranking"),
        ]);
        if (!cancelled) {
          setReviews(r);
          setRanking(k);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>处方点评与反馈</Title>
        <Paragraph type="secondary">点评列表·合理用药率·科室排名</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="点评数" value={reviews.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="全院合理率" value={`${ranking?.overallRate ?? 0}%`} /></Card></Col>
              <Col span={8}><Card><Statistic title="排名第一" value={ranking?.deptRanking?.[0]?.dept ?? "—"} /></Card></Col>
            </Row>
            <Card title="科室合理用药率排名" style={{ marginTop: 16 }}>
              <List
                dataSource={ranking?.deptRanking ?? []}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta title={`#${d.rank} ${d.dept}`} description={`合理率 ${d.rationalRate}%`} />
                    <Tag color={d.rationalRate >= 90 ? "green" : d.rationalRate >= 80 ? "blue" : "red"}>
                      {d.rationalRate}%
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="待点评处方" style={{ marginTop: 16 }}>
              <List
                dataSource={reviews}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta title={`${r.prescriptionId} by ${r.reviewer}`} description={r.comment} />
                    <Tag color={r.result === "合理" ? "green" : "red"}>{r.result}</Tag>
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
