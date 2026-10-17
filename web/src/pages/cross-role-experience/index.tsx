/**
 * 健澜科技 jlmedaios - 跨角色经验安全复用 V13 页（M295-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AdaptedItem {
  experienceId: string;
  sourceRole: string;
  targetRole: string;
  adaptedTitle: string;
  adaptedAction: string;
  transferabilityScore: number;
}

interface Resp {
  targetRole: string;
  count: number;
  items: AdaptedItem[];
}

export default function CrossRoleExperiencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/cross-role-experience?targetRole=nurse");
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
        <Title level={3} style={{ color: VI.deep }}>跨角色经验复用</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card bordered={false} style={{ background: VI.deep, color: "#fff", marginBottom: 16 }}>
              <Paragraph style={{ color: "#fff" }}>
                推送给 <Tag color="orange">{data.targetRole}</Tag> 角色共 {data.count} 条适配经验
              </Paragraph>
            </Card>
            <Row gutter={[16, 16]}>
              {data.items.map((it) => (
                <Col span={12} key={it.experienceId}>
                  <Card title={it.adaptedTitle}>
                    <Paragraph>{it.adaptedAction}</Paragraph>
                    <Tag color="blue">来自 {it.sourceRole}</Tag>
                    <Tag color="green" style={{ marginLeft: 8 }}>可迁移 {it.transferabilityScore}</Tag>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
