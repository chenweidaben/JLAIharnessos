/**
 * 健澜科技 jlmedaios - 呼吸系统疾病管理 V5 页（M264-C）
 *
 * 肺功能/mMRC/CAT/支气管扩张剂/吸入技术/急性加重/GINA分级/控制测试/ICS/缓解用药/峰流速/急性发作/肺炎CURB-65/抗生素选择/疗程/疗效/随访/HRCT分类/激素/免疫抑制剂/随访/PSG/AHI/CPAP/体重/合并症/气管镜/EBUS/冷冻/活检/肿瘤介入/运动呼吸训练/营养心理/长期氧疗/急性加重率/再入院/肺功能/死亡率/满意度。深海蓝 VI。
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
  copd: { pft: number; mmrc: number; cat: number; bronchodilator: number; inhalerTechnique: number; exacerbation: number };
  asthma: { gina: number; controlTest: number; ics: number; reliever: number; peakFlow: number; attack: number };
  pneumonia: { curb65: number; antibiotic: number; course: number; efficacy: number; followup: number };
  ild: { hrct: number; classification: number; steroid: number; immunosuppressant: number; followup: number };
  osa: { psg: number; ahi: number; cpap: number; weight: number; comorbidity: number };
  intervention: { bronchoscopy: number; ebus: number; cryobiopsy: number; tumor: number };
  rehab: { exercise: number; breathing: number; nutrition: number; psychology: number; ltOT: number };
  metrics: { exacerbationRate: number; readmission: number; pft: number; mortality: number; satisfaction: number };
  suggestions: string[];
}

export default function PulmonologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/pulmonology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>呼吸系统疾病管理 V5</Title>
        <Paragraph type="secondary">肺功能·mMRC·CAT·支气管扩张剂·吸入技术·急性加重 / GINA 分级·控制测试·ICS·缓解用药·峰流速·急性发作 / 肺炎 CURB-65·抗生素选择·疗程·疗效·随访 / HRCT 分类·激素·免疫抑制剂·随访</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="急性加重率" value={`${data.metrics.exacerbationRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="再入院率" value={`${data.metrics.readmission}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="肺功能达标" value={`${data.metrics.pft}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>呼吸明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "copd", name: "COPD 肺功能", value: `${data.copd.pft}%` },
                  { key: "asthma", name: "哮喘 GINA", value: `${data.asthma.gina}%` },
                  { key: "cpap", name: "OSA CPAP", value: `${data.osa.cpap}%` },
                  { key: "bronch", name: "气管镜", value: data.intervention.bronchoscopy },
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
