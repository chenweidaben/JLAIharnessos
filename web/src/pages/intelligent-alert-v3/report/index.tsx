/**
 * 健澜科技 jlmedaios - 智能预警 V3 页（M255-B）
 *
 * MEWS/NEWS2/PEWS儿童产科早期预警评分/检验影像心电危急值闭环通知/Caprini/Padua/Autar预防出血监测/手卫生MDRO/SSI/VAP/CLABSI/CAUTI聚集发病/心跳骤停脓毒症呼吸衰竭休克多器官衰竭AI预警/高警示过敏相互作用重复用药剂量错误拦截/跌倒压疮营养皮肤评估预防/预警规则阈值通知闭环误报疲劳优化。深海蓝 VI。
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
  earlyWarning: { mews: number; news2: number; pews: number; pediatric: number; obstetric: number };
  critical: { lab: number; imaging: number; ecg: number; closedLoop: number };
  vte: { caprini: number; padua: number; autar: number; prevention: number; bleeding: number };
  infection: { handHygiene: number; mdro: number; ssi: number; vap: number; clabsi: number; cauti: number };
  deterioration: { arrest: number; sepsis: number; respiratoryFailure: number; shock: number; mof: number };
  medication: { highAlert: number; allergy: number; interaction: number; duplication: number; doseError: number };
  safety: { fall: number; pressureUlcer: number; nutrition: number; skin: number };
  management: { rule: number; threshold: number; notify: number; closedLoop: number; falsePositive: number; fatigue: number };
  suggestions: string[];
}

export default function IntelligentAlertV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/intelligent-alert-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>智能预警 V3</Title>
        <Paragraph type="secondary">MEWS·NEWS2·PEWS·儿童·产科·早期预警 / 检验·影像·心电·危急值·闭环通知 / Caprini·Padua·Autar·预防·出血监测 / 手卫生·MDRO·SSI·VAP·CLABSI·CAUTI / 心跳骤停·脓毒症·呼吸衰竭·休克·MOF / 高警示·过敏·相互作用·重复用药·剂量错误 / 跌倒·压疮·营养·皮肤评估·预防 / 预警规则·阈值·通知·闭环·误报·疲劳</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="MEWS 预警" value={data.earlyWarning.mews} /></Card></Col>
              <Col span={6}><Card><Statistic title="危急值闭环率" value={`${data.critical.closedLoop}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="VTE 预防" value={data.vte.prevention} /></Card></Col>
              <Col span={6}><Card><Statistic title="脓毒症" value={data.deterioration.sepsis} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>预警明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "handHygiene", name: "手卫生依从性", value: `${data.infection.handHygiene}%` },
                  { key: "highAlert", name: "高警示拦截", value: data.medication.highAlert },
                  { key: "fall", name: "跌倒", value: data.safety.fall },
                  { key: "falsePositive", name: "误报率", value: `${data.management.falsePositive}%` },
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
