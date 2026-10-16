/**
 * 健澜科技 jlmedaios - 信息化规划 V3 页（M244-A）
 *
 * 3-5年数字化转型战略/投资预算ROI/业务应用数据技术集成架构云原生微服务/HIS-EMR-LIS-PACS/ESB-API网关/EMPI-HL7-FHIR。深海蓝 VI。
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
  strategy: { years: number; budget: number; roi: number };
  architecture: { business: number; data: number; tech: number };
  systems: { his: number; emr: number; lis: number; pacs: number };
  integration: { esb: number; api: number; empi: number; fhir: number };
  suggestions: string[];
}

export default function InformatizationV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/informatization-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>信息化规划 V3</Title>
        <Paragraph type="secondary">3-5 年数字化转型战略 / 投资预算 ROI / 业务·应用·数据·技术·集成架构云原生微服务 / HIS·EMR·LIS·PACS / ESB·API 网关·EMPI·HL7·FHIR</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="规划年限" value={data.strategy.years} /></Card></Col>
              <Col span={6}><Card><Statistic title="预算(万)" value={data.strategy.budget} /></Card></Col>
              <Col span={6}><Card><Statistic title="ROI" value={`${data.strategy.roi}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="API 数" value={data.integration.api} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>系统明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "his", name: "HIS", value: data.systems.his },
                  { key: "emr", name: "EMR", value: data.systems.emr },
                  { key: "lis", name: "LIS", value: data.systems.lis },
                  { key: "fhir", name: "FHIR 接口", value: data.integration.fhir },
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
