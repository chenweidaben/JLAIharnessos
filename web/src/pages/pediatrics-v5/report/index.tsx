/**
 * 健澜科技 jlmedaios - 儿科与新生儿 V5 页（M266-A）
 *
 * 生长发育营养疫苗发育筛查高危儿随访心理行为/早产NICU黄疸呼吸感染保温脑损伤筛查出院随访/肺炎哮喘毛细支气管炎反复呼吸道感染雾化/腹泻呕吐便秘食物过敏营养不良液体疗法/癫痫脑性瘫痪发育迟缓多动症自闭症/高热惊厥脱水哮喘持续窒息中毒创伤/剂量肝肾功能药物相互作用依从性家长教育/新生儿死亡率早产并发症疫苗接种率生长达标率满意度。深海蓝 VI。
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
  childHealth: { growth: number; nutrition: number; vaccine: number; devScreen: number; highRiskFollowup: number; psych: number };
  neonate: { premature: number; nicu: number; jaundice: number; resp: number; infection: number; warming: number; brainInjury: number; followup: number };
  respiratory: { pneumonia: number; asthma: number; bronchiolitis: number; recurrentRTI: number; nebulizer: number };
  digestive: { diarrhea: number; vomiting: number; constipation: number; foodAllergy: number; malnutrition: number; fluid: number };
  neuro: { epilepsy: number; cp: number; delay: number; adhd: number; autism: number };
  emergency: { febrileSeizure: number; dehydration: number; statusAsthmatic: number; asphyxia: number; poisoning: number; trauma: number };
  pharmacy: { dosing: number; liverKidney: number; interaction: number; adherence: number; parentEducation: number };
  metrics: { neonatalMortality: number; prematureComplication: number; vaccineCoverage: number; growthAchievement: number; satisfaction: number };
  suggestions: string[];
}

export default function PediatricsV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/pediatrics-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>儿科与新生儿 V5</Title>
        <Paragraph type="secondary">生长发育·营养·疫苗·发育筛查·高危儿随访·心理行为 / 早产·NICU·黄疸·呼吸·感染·保温·脑损伤·出院随访 / 肺炎·哮喘·毛细支气管炎·反复呼吸道感染·雾化 / 腹泻·呕吐·便秘·食物过敏·营养不良·液体疗法</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="新生儿死亡率" value={`${data.metrics.neonatalMortality}‰`} /></Card></Col>
              <Col span={6}><Card><Statistic title="疫苗接种率" value={`${data.metrics.vaccineCoverage}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="生长达标率" value={`${data.metrics.growthAchievement}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>儿科明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "nicu", name: "NICU", value: data.neonate.nicu },
                  { key: "jaundice", name: "新生儿黄疸", value: data.neonate.jaundice },
                  { key: "asthma", name: "儿童哮喘", value: data.respiratory.asthma },
                  { key: "diarrhea", name: "腹泻", value: data.digestive.diarrhea },
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
