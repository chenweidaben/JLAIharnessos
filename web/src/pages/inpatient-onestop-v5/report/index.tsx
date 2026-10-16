/**
 * 健澜科技 jlmedaios - 住院一站式服务 V5 页（M270-B）
 *
 * 入院准备中心（院前评估/床位预约/住院证/宣教/物资/一站式）/入院办理（床旁/自助/移动/押金/腕带/宣教/一站式完成）/住院服务（送餐/被服/陪护/探视/便民/费用查询/一日清）/出院准备（出院计划/带药/结算/预约复诊/随访/交通）/出院结算（医保/商保/自费/电子票据/床旁结算/自助机/零跑腿）/住院押金（押金管理/补缴/退费/预授权/费用预警/信用住）/一站式指标（入院时长/出院时长/床旁结算率/满意度/投诉）/服务改进（等待/断点/痛点/流程再造/持续优化）。深海蓝 VI。
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
  admissionPre: { preAssessment: number; bedReservation: number; hospitalCert: number; education: number; supplies: number; oneStop: number };
  admissionProcess: { bedside: number; selfService: number; mobile: number; deposit: number; wristband: number; education: number; oneStop: number };
  inpatientService: { meals: number; linen: number; companion: number; visitor: number; convenience: number; feeQuery: number; dailySettlement: number };
  dischargePrep: { dischargePlan: number; meds: number; payment: number; followup: number; appointment: number; transport: number };
  dischargeSettlement: { insurance: number; commercial: number; selfPay: number; eInvoice: number; bedsideSettlement: number; selfService: number; zeroTravel: number };
  depositMgmt: { deposit: number; supplement: number; refund: number; preauth: number; feeAlert: number; creditStay: number };
  metrics: { admissionDuration: number; dischargeDuration: number; bedsideSettlementRate: number; satisfaction: number; complaint: number };
  improvement: { wait: number; breakpoint: number; painPoint: number; processReengineering: number; continuous: number };
  suggestions: string[];
}

export default function InpatientOneStopV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/inpatient-onestop-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>住院一站式服务 V5</Title>
        <Paragraph type="secondary">入院准备中心·院前评估·床位预约·住院证·宣教·物资·一站式 / 入院办理·床旁·自助·移动·押金·腕带·宣教·一站式完成 / 住院服务·送餐·被服·陪护·探视·便民·费用查询·一日清</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="入院时长" value={`${data.metrics.admissionDuration}min`} /></Card></Col>
              <Col span={6}><Card><Statistic title="出院时长" value={`${data.metrics.dischargeDuration}min`} /></Card></Col>
              <Col span={6}><Card><Statistic title="床旁结算率" value={`${data.metrics.bedsideSettlementRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>一站式明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "pre", name: "院前评估", value: `${data.admissionPre.preAssessment}%` },
                  { key: "bedside", name: "床旁办理", value: `${data.admissionProcess.bedside}%` },
                  { key: "settle", name: "医保结算", value: `${data.dischargeSettlement.insurance}%` },
                  { key: "einv", name: "电子票据", value: `${data.dischargeSettlement.eInvoice}%` },
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
