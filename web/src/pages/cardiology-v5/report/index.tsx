/**
 * 健澜科技 jlmedaios - 心血管疾病管理 V5 页（M264-B）
 *
 * 心绞痛心梗PCI/CABG/双抗/二级预防/随访/房颤早搏室上速/射频消融/起搏器/ICD/Holter/急慢性心衰/BNP/NT-proBNP/利尿剂/再入院/体重监测/分级危险分层/家庭血压/用药调整/靶器官损害/LDL-C/他汀/依折麦布/PCSK9/降脂目标/扩心病肥厚型瓣膜/超声/手术介入/I-II-III期/运动处方/心理/营养/戒烟/随访/再入院率/死亡率/控制率/介入量/平均住院日。深海蓝 VI。
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
  coronary: { angina: number; mi: number; pci: number; cabg: number; dapt: number; secondaryPrevention: number; followup: number };
  arrhythmia: { af: number; pvc: number; svt: number; ablation: number; pacemaker: number; icd: number; holter: number };
  heartFailure: { acute: number; chronic: number; bnp: number; ntProBnp: number; diuretic: number; readmission: number; weightMonitor: number };
  hypertension: { grade: number; riskStratification: number; homeBP: number; medAdjustment: number; targetOrgan: number };
  lipid: { ldlc: number; statin: number; ezetimibe: number; pcsk9: number; lipidTarget: number };
  structural: { dcm: number; hcm: number; valve: number; echo: number; surgery: number; intervention: number };
  rehab: { phase1: number; phase2: number; phase3: number; exercise: number; psychology: number; nutrition: number; smoking: number };
  metrics: { readmission: number; mortality: number; controlRate: number; intervention: number; los: number };
  suggestions: string[];
}

export default function CardiologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cardiology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>心血管疾病管理 V5</Title>
        <Paragraph type="secondary">心绞痛·心梗·PCI·CABG·双抗·二级预防·随访 / 房颤·早搏·室上速·射频消融·起搏器·ICD·Holter / 急慢性心衰·BNP·NT-proBNP·利尿剂·再入院·体重监测 / 分级·危险分层·家庭血压·用药调整·靶器官损害</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="再入院率" value={`${data.metrics.readmission}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="死亡率" value={`${data.metrics.mortality}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="控制率" value={`${data.metrics.controlRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="介入量" value={data.metrics.intervention} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>心血管明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "pci", name: "PCI", value: data.coronary.pci },
                  { key: "af", name: "房颤", value: data.arrhythmia.af },
                  { key: "bnp", name: "BNP 检测", value: `${data.heartFailure.bnp}%` },
                  { key: "statin", name: "他汀使用", value: `${data.lipid.statin}%` },
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
