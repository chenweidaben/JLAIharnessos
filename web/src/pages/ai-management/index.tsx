/**
 * 健澜科技 jlmedaios - AI 管理应用 V13 页（M366-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  aiOperationDecisionCount: number;
  aiResourceDispatchCount: number;
  aiWarningAccuracyRate: number;
}

export default function AiManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/ai-management");
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
        <Title level={3} style={{ color: VI.deep }}>AI 管理应用</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="AI 运营决策数" value={data.aiOperationDecisionCount} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="AI 资源调度次数" value={data.aiResourceDispatchCount} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="AI 预警准确率" value={data.aiWarningAccuracyRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
