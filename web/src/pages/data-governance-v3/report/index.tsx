/**
 * 健澜科技 jlmedaios - 数据治理 V3 页（M244-B）
 *
 * 数据元数据集代码集主数据MD/完整准确一致及时唯一合规六维质量/分类分级脱敏加密DLP/ODS-DW-DM数据湖血缘。深海蓝 VI。
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
  standards: { dataElement: number; dataset: number; codeSet: number; masterData: number };
  quality: { completeness: number; accuracy: number; consistency: number };
  security: { classified: number; desensitized: number; dlp: number };
  architecture: { ods: number; dw: number; dm: number; lake: number };
  suggestions: string[];
}

export default function DataGovernanceV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/data-governance-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>数据治理 V3</Title>
        <Paragraph type="secondary">数据元·数据集·代码集·主数据 MD / 完整·准确·一致·及时·唯一·合规六维质量 / 分类分级·脱敏·加密·DLP / ODS·DW·DM·数据湖血缘</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="数据元" value={data.standards.dataElement} /></Card></Col>
              <Col span={6}><Card><Statistic title="完整性" value={`${data.quality.completeness}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="已分类" value={data.security.classified} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据集市" value={data.architecture.dm} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>治理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "dataset", name: "数据集", value: data.standards.dataset },
                  { key: "masterData", name: "主数据", value: data.standards.masterData },
                  { key: "desensitized", name: "已脱敏", value: data.security.desensitized },
                  { key: "lake", name: "数据湖", value: data.architecture.lake },
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
