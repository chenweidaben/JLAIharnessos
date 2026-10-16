/**
 * 健澜科技 jlmedaios - 药品供应链 V3 页（M256-D）
 *
 * 采购计划招投标合同验收入库付款供应商评价/安全库存周转效期近效期预警报损盘点ABC/麻精毒性放射性易制毒双人双锁专册追溯/冷链设备温度监测断链验证应急冷链追溯/SPD延伸药房自动化整盒发药单剂量智能药房/一物一码最小销售单元追溯码出入库召回不良反应/中心药房病区药房静脉用药调配出院带药夜间/采购成本库存周转供应商效期断货AI预测。深海蓝 VI。
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
  procurement: { plan: number; bid: number; contract: number; accept: number; storage: number; payment: number; vendorEval: number };
  inventory: { safetyStock: number; turnover: number; expiry: number; nearExpiry: number; warning: number; loss: number; count: number; abc: number };
  special: { narcotic: number; toxic: number; radioactive: number; precursor: number; doubleLock: number; ledger: number; traceability: number };
  coldChain: { equipment: number; tempMonitoring: number; break: number; validation: number; emergency: number; trace: number };
  spd: { extension: number; pharmacyAutomation: number; fullBox: number; singleDose: number; smartPharmacy: number };
  trace: { oneItemOneCode: number; minUnit: number; traceCode: number; inout: number; recall: number; adr: number };
  distribution: { central: number; ward: number; pivas: number; discharge: number; night: number };
  analysis: { cost: number; turnover: number; vendor: number; expiry: number; stockout: number; aiForecast: number };
  suggestions: string[];
}

export default function DrugSupplyChainV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/drug-supply-chain-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>药品供应链 V3</Title>
        <Paragraph type="secondary">采购计划·招投标·合同·验收·入库·付款·供应商评价 / 安全库存·周转·效期·近效期·预警·报损·盘点·ABC / 麻精·毒性·放射性·易制毒·双人双锁·专册·追溯 / 冷链设备·温度监测·断链·验证·应急·追溯 / SPD 延伸·药房自动化·整盒发药·单剂量·智能药房 / 一物一码·最小单元·追溯码·出入库·召回·不良反应 / 中心药房·病区药房·PIVAS·出院带药·夜间 / 采购成本·库存周转·供应商·效期·断货·AI 预测</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="库存周转" value={data.inventory.turnover} suffix="天" /></Card></Col>
              <Col span={6}><Card><Statistic title="麻精药品" value={data.special.narcotic} /></Card></Col>
              <Col span={6}><Card><Statistic title="冷链断链" value={data.coldChain.break} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 预测" value={`${data.analysis.aiForecast}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>供应链明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "safetyStock", name: "安全库存达标率", value: `${data.inventory.safetyStock}%` },
                  { key: "traceCode", name: "追溯码覆盖", value: `${data.trace.traceCode}%` },
                  { key: "stockout", name: "断货次数", value: data.analysis.stockout },
                  { key: "spd", name: "SPD 延伸", value: data.spd.extension },
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
