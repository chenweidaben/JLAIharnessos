/**
 * 健澜科技 jlmedaios - 患者安全 V3 页（M256-A 深化）
 *
 * I-IV级上报分类分级根因分析RCA改进Just Culture/身份识别手术安全用药安全院感跌倒压疮输血/Just Culture非惩罚上报匿名报告反馈安全学习氛围/VTE/MEWS/脓毒症过敏危急值病情恶化早期预警/高警示目录双人核对专区标识调配运送/Time Out/Sign In/Sign Out部位标识器械清点SSI/纠纷预警投诉处理医疗鉴定保险风险分担调解/不良事件率伤害率Near Miss隐患上报整改率安全文化评分。深海蓝 VI。
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
  incident: { total: number; level1: number; level2: number; level3: number; level4: number; rca: number };
  goals: { id: number; surgery: number; medication: number; infection: number; fall: number; pressure: number; transfusion: number };
  culture: { justCulture: number; nonPunitive: number; anonymous: number; feedback: number; learning: number };
  earlyWarning: { vte: number; mews: number; sepsis: number; allergy: number; critical: number; deterioration: number };
  highAlert: { list: number; doubleCheck: number; zone: number; label: number; prep: number; transport: number };
  surgerySafety: { timeout: number; signIn: number; signOut: number; siteMarkup: number; instrumentCount: number; ssi: number };
  dispute: { warning: number; complaint: number; claim: number; insurance: number; mediation: number };
  metrics: { aeRate: number; harmRate: number; nearMiss: number; hazard: number; rectification: number; cultureScore: number };
  suggestions: string[];
}

export default function PatientSafetyV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-safety-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者安全 V3</Title>
        <Paragraph type="secondary">I-IV 级上报·分类分级·根因分析·RCA·Just Culture / 身份识别·手术安全·用药安全·院感·跌倒·压疮·输血 / Just Culture·非惩罚·匿名·反馈·安全学习氛围 / VTE·MEWS·脓毒症·过敏·危急值·病情恶化 / 高警示目录·双人核对·专区标识·调配运送 / Time Out·Sign In·Sign Out·部位标识·器械清点 / 纠纷预警·投诉处理·医疗鉴定·保险·风险分担 / 不良事件率·伤害率·Near Miss·隐患上报·整改率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="不良事件总数" value={data.incident.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="RCA 分析" value={data.incident.rca} /></Card></Col>
              <Col span={6}><Card><Statistic title="Near Miss" value={data.metrics.nearMiss} /></Card></Col>
              <Col span={6}><Card><Statistic title="安全文化评分" value={data.metrics.cultureScore} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "id", name: "身份识别执行率", value: `${data.goals.id}%` },
                  { key: "justCulture", name: "Just Culture 评分", value: data.culture.justCulture },
                  { key: "highAlert", name: "高警示药品目录", value: data.highAlert.list },
                  { key: "rectification", name: "隐患整改率", value: `${data.metrics.rectification}%` },
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
