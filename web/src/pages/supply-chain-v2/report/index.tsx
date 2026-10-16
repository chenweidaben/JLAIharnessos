/**
 * 健澜科技 jlmedaios - 供应链协同 V2 页（M236-B）
 *
 * SPD一物一码全程追溯/UDI高值耗材植入物召回/安全库存/周转/VMI寄售/供应链金融。深海蓝 VI。
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
  spd: { uniqueCode: number; traceability: number };
  udi: { implant: number; recall: number };
  inventory: { safety: number; turnover: number; vmi: number };
  supplier: { rated: number };
  finance: { financeLease: number };
  suggestions: string[];
}

export default function SupplyChainV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/supply-chain-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院供应链协同 V2</Title>
        <Paragraph type="secondary">SPD 一物一码·全程追溯 / UDI 高值耗材·植入物召回 / 安全库存·周转·VMI 寄售 / 供应链金融</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="SPD 一物一码" value={data.spd.uniqueCode} /></Card></Col>
              <Col span={6}><Card><Statistic title="UDI 植入物" value={data.udi.implant} /></Card></Col>
              <Col span={6}><Card><Statistic title="库存周转 (次/年)" value={data.inventory.turnover} /></Card></Col>
              <Col span={6}><Card><Statistic title="供应链金融 (万)" value={data.finance.financeLease} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>供应链明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "trace", name: "追溯率 (%)", value: data.spd.traceability },
                  { key: "recall", name: "召回次数", value: data.udi.recall },
                  { key: "safety", name: "安全库存", value: data.inventory.safety },
                  { key: "vmi", name: "VMI 寄售", value: data.inventory.vmi },
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
