/**
 * 健澜科技 jlmedaios - 胸痛中心智能化 V5 页（M263-A）
 *
 * 预检分诊首份心电图肌钙蛋白危险分层绿色通道/D2B时间双绕导管室启动转运溶栓后介入/NSTE-ACS危险分层早期介入药物保守/主动脉夹层肺栓塞张力性气胸消化肌肉骨骼鉴别/CCU双抗二级预防随访康复MACE/胸痛中心数据库质控认证持续改进对标/ECG AI判读危险分层路径推荐时间节点预警/D2B/D2N/门球时间再灌注率死亡率并发症。深海蓝 VI。
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
  triage: { firstECG: number; troponin: number; riskStratification: number; greenChannel: number };
  stemi: { d2b: number; doubleBypass: number; cathLabActivation: number; transfer: number; fibrinolysis: number; pci: number };
  nste: { riskStratification: number; earlyIntervention: number; medical: number };
  differential: { ad: number; pe: number; tensionPneumothorax: number; gi: number; musculoskeletal: number };
  ccU: { dapt: number; secondaryPrevention: number; followup: number; rehab: number; mace: number };
  quality: { database: number; qc: number; certification: number; continuous: number; benchmark: number };
  ai: { ecgReading: number; risk: number; path: number; timeline: number; alert: number };
  metrics: { d2b: number; d2n: number; doorBalloon: number; reperfusion: number; mortality: number; complication: number };
  suggestions: string[];
}

export default function ChestPainCenterV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/chest-pain-center-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>胸痛中心智能化 V5</Title>
        <Paragraph type="secondary">预检分诊·首份心电图·肌钙蛋白·危险分层·绿色通道 / D2B 时间·双绕·导管室启动·转运·溶栓·后介入 / NSTE-ACS·危险分层·早期介入·药物保守 / 主动脉夹层·肺栓塞·张力性气胸·消化·肌肉骨骼鉴别</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="D2B 时间" value={`${data.metrics.d2b}分钟`} /></Card></Col>
              <Col span={6}><Card><Statistic title="再灌注率" value={`${data.metrics.reperfusion}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="死亡率" value={`${data.metrics.mortality}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="并发症" value={`${data.metrics.complication}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>胸痛明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "firstECG", name: "首份心电图", value: `${data.triage.firstECG}%` },
                  { key: "cathLab", name: "导管室启动", value: `${data.stemi.cathLabActivation}%` },
                  { key: "dapt", name: "双抗治疗", value: `${data.ccU.dapt}%` },
                  { key: "aiECG", name: "AI ECG 判读", value: `${data.ai.ecgReading}%` },
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
