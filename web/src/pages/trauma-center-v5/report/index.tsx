/**
 * 健澜科技 jlmedaios - 创伤中心智能化 V5 页（M263-C）
 *
 * 院前预警检伤分类多发伤创伤激活团队集合/ISS/RTS/TRISS/CRASH生理指标损伤机制/Damage Control复苏止血保温通气手术顺序/头颅胸腹骨盆四肢血管神经骨科协同/ICU液体平衡凝血低体温酸中毒多器官衰竭/早期康复功能评估心理创伤后成长回归社会/创伤数据库质控认证伤害预防区域协同/创伤评分预测CT快速读片出血预测资源调度。深海蓝 VI。
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
  activation: { prealert: number; triage: number; multipleTrauma: number; teamAssembly: number };
  scoring: { iss: number; rts: number; triss: number; crash: number; physiology: number; mechanism: number };
  damageControl: { resuscitation: number; hemostasis: number; warming: number; ventilation: number; surgeryOrder: number };
  multiInjury: { head: number; chest: number; abdomen: number; pelvis: number; extremity: number; vascular: number; neurosurgery: number; orthopedics: number };
  icu: { fluidBalance: number; coagulation: number; hypothermia: number; acidosis: number; mof: number };
  recovery: { earlyRehab: number; functionalAssess: number; psychology: number; ptss: number; returnSociety: number };
  quality: { database: number; qc: number; certification: number; injuryPrevention: number; regional: number };
  ai: { scoring: number; prediction: number; ctRapid: number; hemorrhage: number; resource: number };
  metrics: { mortality: number; laparotomy: number; icuLOS: number; complication: number };
  suggestions: string[];
}

export default function TraumaCenterV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/trauma-center-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>创伤中心智能化 V5</Title>
        <Paragraph type="secondary">院前预警·检伤分类·多发伤·创伤激活·团队集合 / ISS·RTS·TRISS·CRASH·生理指标·损伤机制 / Damage Control 复苏·止血·保温·通气·手术顺序 / 头颅·胸腹·骨盆·四肢·血管·神经·骨科协同</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="死亡率" value={`${data.metrics.mortality}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="剖腹探查" value={data.metrics.laparotomy} /></Card></Col>
              <Col span={6}><Card><Statistic title="ICU 住院日" value={`${data.metrics.icuLOS}天`} /></Card></Col>
              <Col span={6}><Card><Statistic title="并发症" value={`${data.metrics.complication}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>创伤明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "team", name: "团队集合", value: `${data.activation.teamAssembly}%` },
                  { key: "iss", name: "平均 ISS", value: data.scoring.iss },
                  { key: "hemostasis", name: "止血", value: `${data.damageControl.hemostasis}%` },
                  { key: "aiCT", name: "AI CT 快速读片", value: `${data.ai.ctRapid}%` },
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
