/**
 * 健澜科技 jlmedaios - 危重症中心智能化 V5 页（M263-D）
 *
 * APACHE II/SOFA/MRC评分转入指征转出标准/呼吸循环肾脏CRRT肝脏营养血糖ECMO/有创血压CVP/SvO2/PiCCO超声颅内压脑电/脓毒症1小时bundle乳酸血培养抗感染源控制/RASS/CAM-ICU谵妄每日唤醒早期活动/转出ICU后综合征PICS随访康复家庭支持/VAP/CLABSI/CAUTI/再入ICU/死亡率/住院日/费用/病情恶化预测脓毒症早警脱机预测资源调度。深海蓝 VI。
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
  admission: { apache: number; sofa: number; mrc: number; admissionCriteria: number; dischargeCriteria: number };
  organSupport: { respiratory: number; circulation: number; kidney: number; crrt: number; liver: number; nutrition: number; glucose: number; ecmo: number };
  monitoring: { invasiveBP: number; cvp: number; svo2: number; picco: number; us: number; icp: number; eeg: number };
  sepsis: { bundle: number; lactate: number; bloodCulture: number; antibiotic: number; sourceControl: number };
  sedation: { rass: number; cam: number; delirium: number; dailyWake: number; earlyMobility: number };
  postICU: { pics: number; followup: number; rehab: number; familySupport: number };
  quality: { vap: number; clabsi: number; cauti: number; reICU: number; mortality: number; los: number; cost: number };
  ai: { deterioration: number; sepsisAlert: number; weaning: number; resource: number };
  metrics: { mortality: number; los: number; reICU: number; vap: number };
  suggestions: string[];
}

export default function CriticalCareCenterV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/critical-care-center-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>危重症中心智能化 V5</Title>
        <Paragraph type="secondary">APACHE II·SOFA·MRC·转入指征·转出标准 / 呼吸·循环·肾脏·CRRT·肝脏·营养·血糖·ECMO / 有创血压·CVP·SvO2·PiCCO·超声·颅内压·脑电 / 脓毒症 1h Bundle·乳酸·血培养·抗生素·源控制</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="死亡率" value={`${data.metrics.mortality}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="ICU 住院日" value={`${data.metrics.los}天`} /></Card></Col>
              <Col span={6}><Card><Statistic title="再入 ICU" value={`${data.metrics.reICU}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="VAP 发生率" value={`${data.metrics.vap}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>ICU 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "apache", name: "平均 APACHE II", value: data.admission.apache },
                  { key: "bundle", name: "1h Bundle 依从", value: `${data.sepsis.bundle}%` },
                  { key: "crrt", name: "CRRT", value: `${data.organSupport.crrt}%` },
                  { key: "aiSepsis", name: "AI 脓毒症早警", value: `${data.ai.sepsisAlert}%` },
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
