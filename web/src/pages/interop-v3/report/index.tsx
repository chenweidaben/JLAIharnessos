/**
 * 健澜科技 jlmedaios - 互联互通 V3 页（M231-B）
 *
 * 四级甲/五级成熟度/WS363-WS445/CDA/FHIR/LOINC/SNOMED/ESB/EMPI/CDR/RDR/MDM/检查检验互认/五级冲刺。深海蓝 VI。
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
  maturity: { level: string };
  standards: { ws363: boolean; ws445: boolean; fhir: boolean; loinc: boolean; snomed: boolean };
  platform: { esb: boolean; empI: boolean; cdr: boolean; rdr: boolean; mdm: boolean };
  applications: { integrated: number };
  sharing: { mutualRecognition: boolean };
  security: { assessed: boolean };
  evaluation: { score: number };
  suggestions: string[];
}

export default function InteropV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/interop-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>互联互通 V3</Title>
        <Paragraph type="secondary">四级甲·五级成熟度 / WS363-WS445·CDA·FHIR·LOINC·SNOMED / ESB·EMPI·CDR·RDR·MDM / 检查检验互认·五级冲刺</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="成熟度等级" value={data.maturity.level} /></Card></Col>
              <Col span={6}><Card><Statistic title="接入应用" value={data.applications.integrated} /></Card></Col>
              <Col span={6}><Card><Statistic title="测评得分" value={data.evaluation.score} /></Card></Col>
              <Col span={6}><Card><Statistic title="互认" value={data.sharing.mutualRecognition ? "已实现" : "未实现"} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>标准与平台明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ws363", name: "WS363 数据集", value: data.standards.ws363 ? "已遵循" : "未遵循" },
                  { key: "fhir", name: "FHIR 接口", value: data.standards.fhir ? "已支持" : "未支持" },
                  { key: "esb", name: "ESB 企业服务总线", value: data.platform.esb ? "已部署" : "未部署" },
                  { key: "cdr", name: "CDR 临床数据中心", value: data.platform.cdr ? "已建成" : "未建成" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "状态", dataIndex: "value", key: "value" },
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
