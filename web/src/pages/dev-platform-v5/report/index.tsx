/**
 * 健澜科技 jlmedaios - 医院开发者平台 V5 页（M260-D）
 *
 * API目录SDK文档沙箱订阅计量版本/表单流程规则拖拽业务编排业务人员可用/HL7 FHIR CDA适配器协议转换路由映射/文档教程示例SDK沙箱支持社区/插件钩子事件扩展点自定义不改动核心/契约测试集成测试仿真环境数据脱敏CI/上手时间文档质量沙箱响应满意度NPS/API调用开发者数应用数集成数复用率。深海蓝 VI。
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
  apiMarket: { catalog: number; sdk: number; doc: number; sandbox: number; subscription: number; metering: number; version: number };
  lowCode: { form: number; flow: number; rule: number; dragDrop: number; orchestration: number; noCode: number };
  integration: { hl7: number; fhir: number; cda: number; adapter: number; protocol: number; routing: number; mapping: number };
  portal: { doc: number; tutorial: number; example: number; sdk: number; sandbox: number; support: number; community: number };
  extension: { plugin: number; hook: number; event: number; extensionPoint: number; customize: number; noCoreChange: number };
  quality: { contractTest: number; integrationTest: number; simulation: number; desensitization: number; ci: number };
  platform: { onboardingTime: number; docQuality: number; sandboxResponse: number; satisfaction: number; nps: number };
  metrics: { apiCall: number; developer: number; app: number; integration: number; reuse: number };
  suggestions: string[];
}

export default function DevPlatformV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/dev-platform-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院开发者平台 V5</Title>
        <Paragraph type="secondary">API 目录·SDK·文档·沙箱·订阅·计量·版本 / 表单·流程·规则·拖拽·业务编排·业务人员可用 / HL7·FHIR·CDA·适配器·协议转换·路由映射 / 文档·教程·示例·SDK·沙箱·支持·社区 / 插件·钩子·事件·扩展点·自定义·不改动核心</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="API 调用" value={data.metrics.apiCall.toLocaleString()} /></Card></Col>
              <Col span={6}><Card><Statistic title="开发者" value={data.metrics.developer} /></Card></Col>
              <Col span={6}><Card><Statistic title="复用率" value={`${data.metrics.reuse}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS" value={data.platform.nps} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>平台明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "catalog", name: "API 目录", value: data.apiMarket.catalog },
                  { key: "lowcode", name: "低代码覆盖", value: `${data.lowCode.noCode}%` },
                  { key: "fhir", name: "FHIR 适配器", value: data.integration.fhir },
                  { key: "contract", name: "契约测试", value: `${data.quality.contractTest}%` },
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
