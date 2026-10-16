/**
 * 健澜科技 jlmedaios - 风湿免疫与过敏性疾病 V5 页（M265-C）
 *
 * DAS28关节超声DMARDs生物制剂功能评估/SLEDAI狼疮肾激素免疫抑制剂妊娠/ASDAS脊柱影像生物制剂功能康复/与肾内协同急性发作降尿酸饮食合并症/过敏性鼻炎哮喘特应性皮炎食物过敏脱敏/干燥综合征硬皮病肌炎血管炎抗磷脂综合征/与内分泌协同DXA止痛运动/DAS28缓解复发激素用量功能满意度。深海蓝 VI。
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
  ra: { das28: number; jointUs: number; dmards: number; biologic: number; function: number };
  sle: { sledai: number; lupusNephritis: number; steroid: number; immunosuppressant: number; pregnancy: number };
  as: { asdas: number; spineImaging: number; biologic: number; function: number; rehab: number };
  gout: { nephroCollab: number; acuteFlare: number; urateLowering: number; diet: number; comorbidity: number };
  allergy: { rhinitis: number; asthma: number; dermatitis: number; foodAllergy: number; desensitization: number };
  autoimmune: { sjogren: number; ssc: number; myositis: number; vasculitis: number; aps: number };
  oa: { osteoporosis: number; endoCollab: number; dxa: number; analgesic: number; exercise: number };
  metrics: { das28Remission: number; relapse: number; steroidDose: number; function: number; satisfaction: number };
  suggestions: string[];
}

export default function RheumatologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/rheumatology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>风湿免疫与过敏性疾病 V5</Title>
        <Paragraph type="secondary">RA·DAS28·关节超声·DMARDs·生物制剂·功能评估 / SLE·SLEDAI·狼疮肾·激素·免疫抑制剂·妊娠 / AS·ASDAS·脊柱影像·生物制剂·功能·康复 / 过敏性鼻炎·哮喘·特应性皮炎·食物过敏·脱敏</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="DAS28 缓解率" value={`${data.metrics.das28Remission}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="复发率" value={`${data.metrics.relapse}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="激素用量" value={`${data.metrics.steroidDose}mg`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>风湿明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ra", name: "RA DAS28", value: `${data.ra.das28}%` },
                  { key: "sle", name: "SLE SLEDAI", value: `${data.sle.sledai}%` },
                  { key: "allergy", name: "过敏性鼻炎", value: data.allergy.rhinitis },
                  { key: "biologic", name: "生物制剂", value: data.ra.biologic },
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
