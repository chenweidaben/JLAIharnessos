/**
 * 健澜科技 jlmedaios - 科室运营画像 V5 页（M287-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ProfileRow {
  deptName: string;
  revenue: number;
  cost: number;
  cmi: number;
  avgStayDays: number;
  satisfaction: number;
  rankScore: number;
  headcount: number;
  profile: { profit: number; profitMarginPct: number; health: "green" | "yellow" | "red" };
}

export default function DeptProfilePage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ProfileRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<ProfileRow[]>("/api/v1/dept-profile");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室运营画像</Title>
        <Paragraph type="secondary">收支·CMI·红黄绿分组</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Row gutter={[16, 16]}>
            {list.map((d) => (
              <Col span={6} key={d.deptName}>
                <Card
                  title={d.deptName}
                  extra={<Tag color={d.profile.health === "green" ? "green" : d.profile.health === "yellow" ? "orange" : "red"}>{d.profile.health}</Tag>}
                >
                  <Statistic title="利润(万元)" value={d.profile.profit} />
                  <Paragraph type="secondary">
                    利润率 {d.profile.profitMarginPct}% · CMI {d.cmi} · 平均住院 {d.avgStayDays}天 · 满意度 {d.satisfaction}%
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
