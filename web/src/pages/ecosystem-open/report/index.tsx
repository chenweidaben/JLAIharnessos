/**
 * 健澜科技 jlmedaios - 生态开放 页（M234-D）
 *
 * REST API/GraphQL/Webhook/API网关/第三方药店医保检验影像接入/SDK开放/FHIR/IHE标准/OAuth2.0。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  api: { rest: number; graphql: number; webhook: number };
  gateway: { calls: number; avgLatency: number };
  thirdParty: { pharmacy: number; insurance: number; lab: number; imaging: number };
  sdk: { downloads: number };
  standards: { fhir: boolean; ihe: boolean; oauth2: boolean };
  developer: { apps: number; users: number };
  suggestions: string[];
}

export default function EcosystemOpenPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ecosystem-open/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>医院生态开放</Title>
        <Paragraph type="secondary">REST API·GraphQL·Webhook / API 网关 / 第三方药店·医保·检验·影像接入 / SDK 开放 / FHIR·IHE·OAuth2.0 标准</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="REST API 调用" value={data.api.rest} /></Card></Col>
              <Col span={6}><Card><Statistic title="GraphQL 调用" value={data.api.graphql} /></Card></Col>
              <Col span={6}><Card><Statistic title="网关调用" value={data.gateway.calls} /></Card></Col>
              <Col span={6}><Card><Statistic title="开发者应用" value={data.developer.apps} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>生态开放明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "pharmacy", name: "第三方药店", value: data.thirdParty.pharmacy },
                  { key: "insurance", name: "医保接入", value: data.thirdParty.insurance },
                  { key: "lab", name: "检验接入", value: data.thirdParty.lab },
                  { key: "fhir", name: "FHIR 标准", value: data.standards.fhir ? "支持" : "不支持" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
