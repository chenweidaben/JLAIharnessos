/**
 * 健澜科技 jlmedaios - 内分泌代谢疾病管理 V5 页（M264-D）
 *
 * 1型2型妊娠糖尿病/血糖监测/HbA1c/并发症/胰岛素泵/甲亢甲减结节/超声穿刺/甲功/用药调整/BMI体脂/代谢手术/生活方式/营养/随访/与心血管协同/降脂目标/用药/依从性/急性发作降尿酸饮食合并症/DXA/T-score/钙维生素D/抗骨松/跌倒预防/垂体瘤库欣Addison嗜铬细胞瘤罕见病/HbA1c达标/甲功控制/体重下降/骨折率/急性发作。深海蓝 VI。
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
  diabetes: { t1dm: number; t2dm: number; gdm: number; glucoseMonitoring: number; hba1c: number; complication: number; insulinPump: number };
  thyroid: { hyperthyroid: number; hypothyroid: number; nodule: number; ultrasound: number; fna: number; thyroidFunction: number; medAdjustment: number };
  obesity: { bmi: number; bodyFat: number; metabolicSurgery: number; lifestyle: number; nutrition: number; followup: number };
  lipid: { cardioCollaboration: number; target: number; med: number; adherence: number };
  gout: { acuteFlare: number; urateLowering: number; diet: number; comorbidity: number };
  osteoporosis: { dxa: number; tscore: number; calcium: number; vitaminD: number; antiOsteoporosis: number; fallPrevention: number };
  rare: { pituitary: number; cushing: number; addison: number; pheochromocytoma: number; rare: number };
  metrics: { hba1cControl: number; thyroidControl: number; weightLoss: number; fracture: number; flare: number };
  suggestions: string[];
}

export default function EndocrinologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/endocrinology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>内分泌代谢疾病管理 V5</Title>
        <Paragraph type="secondary">1 型·2 型·妊娠糖尿病·血糖监测·HbA1c·并发症·胰岛素泵 / 甲亢·甲减·结节·超声穿刺·甲功·用药调整 / BMI·体脂·代谢手术·生活方式·营养·随访 / 与心血管协同·降脂目标·用药·依从性</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="HbA1c 达标率" value={`${data.metrics.hba1cControl}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="甲功控制率" value={`${data.metrics.thyroidControl}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="体重下降" value={`${data.metrics.weightLoss}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="骨折率" value={`${data.metrics.fracture}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>内分泌明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "t2dm", name: "2 型糖尿病", value: data.diabetes.t2dm },
                  { key: "nodule", name: "甲状腺结节", value: data.thyroid.nodule },
                  { key: "dxa", name: "骨密度 DXA", value: data.osteoporosis.dxa },
                  { key: "insulin", name: "胰岛素泵", value: data.diabetes.insulinPump },
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
