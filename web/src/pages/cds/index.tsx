/**
 * 健澜科技 jlmedaios - 处方前置审核规则引擎 V7 页（M289-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleRow {
  id: string;
  type: string;
  drugCode: string;
  target: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface HitSummary {
  total: number;
  passCount: number;
}

export default function CdsPage() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [summary, setSummary] = useState<HitSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [r, s] = await Promise.all([
          get<RuleRow[]>("/api/v1/cds/rules"),
          get<HitSummary>("/api/v1/cds/hits"),
        ]);
        if (!cancelled) {
          setRules(r);
          setSummary(s);
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
        <Title level={3} style={{ color: VI.deep }}>处方前置审核</Title>
        <Paragraph type="secondary">相互作用·禁忌·剂量·红黄绿灯</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="规则数" value={rules.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="审核总数" value={summary?.total ?? 0} /></Card></Col>
              <Col span={8}><Card><Statistic title="通过数" value={summary?.passCount ?? 0} /></Card></Col>
            </Row>
            <Card title="规则列表" style={{ marginTop: 16 }}>
              <List
                dataSource={rules}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${r.drugCode} ${r.type}`}
                      description={`target=${r.target} · ${r.message}`}
                    />
                    <Tag color={r.severity === "critical" ? "red" : r.severity === "warning" ? "orange" : "blue"}>
                      {r.severity}
                    </Tag>
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
