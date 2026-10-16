/**
 * 健澜科技 jlmedaios - 互联网医院与处方流转 V5 页（M262-A）
 *
 * 实名认证复诊病种AI预问诊视频图文电子处方/处方审核流转到药房药店配药送药上门追溯/医保线上商保自费电子票据费用结算/在线药师用药咨询处方审核慢病续方/上门服务护士接单服务包价格责任险/处方合规诊疗行为随访隐私投诉/小程序App流程等待满意度复购/在线量复诊率处方流转率送药时效收入。深海蓝 VI。
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
  onlineVisit: { realname: number; followup: number; aiPreVisit: number; video: number; text: number; ePrescription: number };
  prescriptionFlow: { review: number; transfer: number; pharmacy: number; delivery: number; trace: number };
  payment: { onlineInsurance: number; commercial: number; selfPay: number; eInvoice: number; settlement: number };
  pharmacy: { onlineConsult: number; review: number; chronicRefill: number };
  homeService: { nurseOrder: number; servicePackage: number; price: number; insurance: number };
  quality: { rxCompliance: number; treatment: number; followup: number; privacy: number; complaint: number };
  patient: { miniApp: number; flow: number; wait: number; satisfaction: number; repurchase: number };
  metrics: { onlineVolume: number; followupRate: number; transferRate: number; deliveryTime: number; revenue: number };
  suggestions: string[];
}

export default function InternetHospitalV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/internet-hospital-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>互联网医院与处方流转 V5</Title>
        <Paragraph type="secondary">实名认证·复诊病种·AI 预问诊·视频·图文·电子处方 / 处方审核·流转·药房·药店·配药·送药上门·追溯 / 医保线上·商保·自费·电子票据·费用结算 / 在线药师·用药咨询·处方审核·慢病续方 / 上门服务·护士接单·服务包·价格·责任险</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在线量" value={data.metrics.onlineVolume} /></Card></Col>
              <Col span={6}><Card><Statistic title="复诊率" value={`${data.metrics.followupRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="处方流转率" value={`${data.metrics.transferRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="送药时效" value={`${data.metrics.deliveryTime}小时`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>互联网明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "aiPreVisit", name: "AI 预问诊", value: `${data.onlineVisit.aiPreVisit}%` },
                  { key: "eRx", name: "电子处方", value: `${data.onlineVisit.ePrescription}%` },
                  { key: "chronicRefill", name: "慢病续方", value: data.pharmacy.chronicRefill },
                  { key: "satisfaction", name: "满意度", value: `${data.patient.satisfaction}%` },
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
