/**
 * 健澜科技 jlmedaios - 商业健康保险与惠民保 V5 页（M262-D）
 *
 * 商保对接直付理赔电子票据实时结算/城市定制参保理赔免赔特药健康管理/百万医疗重疾慢病齿科体检高端医疗/被保人健康数据风险评估精算反欺诈/商保窗口理赔协助病历复印直付网点/基本医保大病医疗救助商保自费/保险+健康管理干预控费续保价值医疗/商保收入直付量理赔时效满意度控费效果。深海蓝 VI。
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
  commercial: { directBilling: number; claim: number; eInvoice: number; realtime: number };
  huimin: { city: number; insured: number; claim: number; deductible: number; specialDrug: number; healthMgmt: number };
  product: { million: number; critical: number; chronic: number; dental: number; checkup: number; premium: number };
  dataService: { insured: number; healthData: number; risk: number; actuarial: number; antiFraud: number };
  window: { commercial: number; claimAssist: number; recordCopy: number; directPoint: number };
  insuranceChain: { basic: number; catastrophic: number; medicalAid: number; commercial: number; selfPay: number };
  plusMgmt: { insurancePlus: number; healthMgmt: number; intervention: number; costControl: number; renewal: number; valueCare: number };
  metrics: { commercialRevenue: number; directVolume: number; claimTAT: number; satisfaction: number; costControl: number };
  suggestions: string[];
}

export default function CommercialInsuranceV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/commercial-insurance-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>商业健康保险与惠民保 V5</Title>
        <Paragraph type="secondary">商保对接·直付·理赔·电子票据·实时结算 / 城市定制·参保·理赔·免赔·特药·健康管理 / 百万医疗·重疾·慢病·齿科·体检·高端医疗 / 被保人健康数据·风险评估·精算·反欺诈 / 商保窗口·理赔协助·病历复印·直付网点</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="商保收入" value={data.metrics.commercialRevenue} suffix="万" /></Card></Col>
              <Col span={6}><Card><Statistic title="直付量" value={data.metrics.directVolume} /></Card></Col>
              <Col span={6}><Card><Statistic title="理赔时效" value={`${data.metrics.claimTAT}天`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>保险明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "huimin", name: "惠民保参保", value: data.huimin.insured },
                  { key: "million", name: "百万医疗", value: data.product.million },
                  { key: "realtime", name: "实时结算", value: `${data.commercial.realtime}%` },
                  { key: "costControl", name: "控费效果", value: `${data.metrics.costControl}%` },
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
