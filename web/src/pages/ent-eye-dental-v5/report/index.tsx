/**
 * 健澜科技 jlmedaios - 眼科耳鼻喉口腔 V5 页（M266-D）
 *
 * 白内障青光眼眼底病斜视弱视眼表近视防控验光/中耳炎鼻窦炎扁桃体鼾症嗓音耳聋眩晕气管异物/龋齿牙周牙髓口腔黏膜颌面外科正畸种植儿童口腔/眼外伤气管食管异鼻出血喉梗阻耳道异物/助听器人工耳蜗低视力助视器康复/眼底青光眼口腔癌鼻咽镜早诊/局麻镇静日间手术围手术期术后随访/手术量并发症视力改善听力改善满意度。深海蓝 VI。
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
  eye: { cataract: number; glaucoma: number; fundus: number; strabismus: number; amblyopia: number; ocular: number; myopiaControl: number; refraction: number };
  ent: { otitisMedia: number; sinusitis: number; tonsil: number; snoring: number; voice: number; deafness: number; vertigo: number; trachealFB: number };
  dental: { caries: number; periodontal: number; endodontic: number; oralMucosa: number; omfs: number; orthodontics: number; implant: number; pediatricOral: number };
  emergency: { eyeTrauma: number; tes: number; epistaxis: number; laryngealObstruction: number; eacFB: number };
  rehab: { hearingAid: number; cochlear: number; lowVision: number; visionAid: number; rehab: number };
  earlyDetection: { fundus: number; glaucoma: number; oralCancer: number; nasopharyngoscopy: number; early: number };
  perioperative: { local: number; sedation: number; daySurgery: number; perioperative: number; followup: number };
  metrics: { surgicalVolume: number; complication: number; visionImprovement: number; hearingImprovement: number; satisfaction: number };
  suggestions: string[];
}

export default function ENTEyeDentalV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ent-eye-dental-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>眼科耳鼻喉口腔 V5</Title>
        <Paragraph type="secondary">白内障·青光眼·眼底病·斜视·弱视·眼表·近视防控·验光 / 中耳炎·鼻窦炎·扁桃体·鼾症·嗓音·耳聋·眩晕·气管异物 / 龋齿·牙周·牙髓·口腔黏膜·颌面外科·正畸·种植·儿童口腔</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="手术量" value={data.metrics.surgicalVolume} /></Card></Col>
              <Col span={6}><Card><Statistic title="并发症率" value={`${data.metrics.complication}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="视力改善" value={`${data.metrics.visionImprovement}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>眼耳鼻喉口腔明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "cataract", name: "白内障", value: data.eye.cataract },
                  { key: "otitis", name: "中耳炎", value: data.ent.otitisMedia },
                  { key: "caries", name: "龋齿", value: data.dental.caries },
                  { key: "hearingAid", name: "助听器", value: data.rehab.hearingAid },
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
