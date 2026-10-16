/**
 * 健澜科技 jlmedaios - 供应链 V3 页（M246-B）
 *
 * SPD一物一码智能柜全程追溯/供应商准入评价分级绩效/ABC库存/VMI寄售/UDI高值植入物召回/供应链金融。深海蓝 VI。
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
  spd: { items: number; cabinets: number; traceability: number };
  vendors: { total: number; rated: number; top: number };
  inventory: { abc: number; vmi: number; consignment: number };
  finance: { contract: number; payment: number };
  suggestions: string[];
}

export default function SupplyChainV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/supply-chain-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>供应链协同 V3</Title>
        <Paragraph type="secondary">SPD·一物一码·智能柜·全程追溯 / 供应商准入·评价·分级·绩效 / ABC 库存·VMI 寄售 / UDI·高值植入物·召回 / 供应链金融</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="SPD 品项" value={data.spd.items} /></Card></Col>
              <Col span={6}><Card><Statistic title="追溯率" value={`${data.spd.traceability}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="供应商" value={data.vendors.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="VMI 寄售" value={data.inventory.vmi} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>供应链明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "cabinets", name: "智能柜", value: data.spd.cabinets },
                  { key: "rated", name: "评级供应商", value: data.vendors.rated },
                  { key: "abc", name: "ABC 分类", value: data.inventory.abc },
                  { key: "contract", name: "合同执行率", value: `${data.finance.contract}%` },
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
