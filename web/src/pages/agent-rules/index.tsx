/**
 * 健澜科技 jlmedaios - 从反馈沉淀个性化推荐规则 V9 页（M291-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Switch, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleRow {
  id: string;
  role: string;
  pattern: string;
  weight: number;
  sourceCnt: number;
  enabled: boolean;
}

interface Library {
  totalRules: number;
  enabledRules: number;
  highWeightRules: number;
}

interface Result {
  rules: RuleRow[];
  library: Library;
}

export default function AgentRulesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/agent/rules");
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
        <Title level={3} style={{ color: VI.deep }}>个性化推荐规则库</Title>
        <Paragraph type="secondary">权重条·启停·来源反馈数</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!data || loading ? null : (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="总规则" value={data.library.totalRules} /></Card></Col>
              <Col span={8}><Card><Statistic title="启用中" value={data.library.enabledRules} /></Card></Col>
              <Col span={8}><Card><Statistic title="高权重(≥0.7)" value={data.library.highWeightRules} /></Card></Col>
            </Row>
            <Card title="规则列表" style={{ marginTop: 16 }}>
              <List
                dataSource={data.rules}
                renderItem={(r) => (
                  <List.Item
                    actions={[
                      <Switch key="sw" checked={r.enabled} />,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${r.pattern}（${r.role}）`}
                      description={`权重=${r.weight} · 来源反馈=${r.sourceCnt}`}
                    />
                    <Tag color={r.weight >= 0.7 ? "green" : r.weight >= 0.3 ? "blue" : "red"}>
                      {r.weight}
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
