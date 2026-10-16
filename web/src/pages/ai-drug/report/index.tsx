/**
 * 健澜科技 jlmedaios - AI 药物研发与临床 页（M237-A）
 *
 * 靶点发现/分子生成/虚拟筛选/ADMET预测/AI临床试验设计/受试者招募/RWE/ADR信号挖掘/药物基因组学精准用药。深海蓝 VI。
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
  discovery: { target: number; molecule: number; screening: number; admet: number };
  clinical: { design: number; recruitment: number; rwe: number };
  safety: { adr: number; pgrx: number };
  collaboration: { partner: number };
  suggestions: string[];
}

export default function AIDrugDiscoveryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ai-drug/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 药物研发与临床</Title>
        <Paragraph type="secondary">靶点·分子生成·虚拟筛选·ADMET / AI 临床试验设计·受试者招募·RWE / ADR 信号挖掘·药物基因组学精准用药</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="虚拟筛选" value={data.discovery.screening} /></Card></Col>
              <Col span={6}><Card><Statistic title="受试者招募" value={data.clinical.recruitment} /></Card></Col>
              <Col span={6}><Card><Statistic title="ADR 信号" value={data.safety.adr} /></Card></Col>
              <Col span={6}><Card><Statistic title="药物基因组" value={data.safety.pgrx} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>药物研发明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "target", name: "靶点发现", value: data.discovery.target },
                  { key: "molecule", name: "分子生成", value: data.discovery.molecule },
                  { key: "rwe", name: "RWE 研究", value: data.clinical.rwe },
                  { key: "partner", name: "合作方", value: data.collaboration.partner },
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
