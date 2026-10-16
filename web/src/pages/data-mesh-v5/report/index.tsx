/**
 * 健澜科技 jlmedaios - 数据 Mesh 与数据产品化 V5 页（M260-B）
 *
 * 临床域管理域运营域患者域科研域边界/数据集数据API数据报告数据大屏数据订阅/Domain Owner数据产品经理数据SLA数据契约/自助取数自助分析自助建模数据目录数据申请/质量等级新鲜度完整性一致性违约处理/分类分级隐私计算脱敏访问审计数据共享/统一目录搜索申请审批使用反馈数据地图/产品数使用率满意度复用率数据消费。深海蓝 VI。
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
  domain: { clinical: number; mgmt: number; ops: number; patient: number; research: number; boundary: number };
  product: { dataset: number; api: number; report: number; dashboard: number; subscription: number };
  ownership: { domainOwner: number; productManager: number; sla: number; contract: number };
  selfService: { query: number; analysis: number; modeling: number; catalog: number; application: number };
  quality: { grade: number; freshness: number; completeness: number; consistency: number; breach: number };
  security: { classification: number; level: number; privacyCompute: number; desensitization: number; audit: number; sharing: number };
  catalog: { unified: number; search: number; approval: number; feedback: number; map: number };
  aiMetrics: { productCount: number; usage: number; satisfaction: number; reuse: number; consumption: number };
  suggestions: string[];
}

export default function DataMeshV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/data-mesh-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>数据 Mesh 与数据产品化 V5</Title>
        <Paragraph type="secondary">临床域·管理域·运营域·患者域·科研域·边界 / 数据集·数据 API·数据报告·数据大屏·数据订阅 / Domain Owner·数据产品经理·数据 SLA·数据契约 / 自助取数·自助分析·自助建模·数据目录·数据申请 / 质量等级·新鲜度·完整性·一致性·违约处理 / 分类分级·隐私计算·脱敏·访问审计·数据共享</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="数据产品" value={data.aiMetrics.productCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="使用率" value={`${data.aiMetrics.usage}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="复用率" value={`${data.aiMetrics.reuse}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.aiMetrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "dataset", name: "数据集", value: data.product.dataset },
                  { key: "sla", name: "数据 SLA", value: `${data.ownership.sla}%` },
                  { key: "catalog", name: "统一目录搜索", value: data.catalog.search },
                  { key: "consumption", name: "数据消费", value: data.aiMetrics.consumption },
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
