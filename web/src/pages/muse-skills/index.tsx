/**
 * 健澜科技 jlmedaios - MUSE 能力市场与可插拔技能 V5 页（M284-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  totalSkills: number;
  enabledCount: number;
}

export default function MuseSkillsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-skills");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 能力市场</Title>
        <Paragraph type="secondary">可插拔技能·按角色启用·版本管理</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={12}><Card><Statistic title="已安装技能" value={data.totalSkills} /></Card></Col>
            <Col span={12}><Card><Statistic title="启用中" value={data.enabledCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
