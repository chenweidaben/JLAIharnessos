/**
 * 健澜科技 jlmedaios - 智慧病房 IoT V5 页（M268-A）
 *
 * 智能病床（离床报警/体位/翻身/压力/在床时长/护理站联动）/输液监控（滴速/余量/结束报警/异常/自动提醒护士）/生命体征采集（床头监护/动态体温/血压/SpO2/自动入病历）/环境感知（温湿度/光照/噪音/空气质量/床单位清洁提醒）/智能呼叫（分级呼叫/位置/语音/视频/护理路径自动推荐）/门禁定位（腕带定位/患者安全/走失预警/医护轨迹）/设备联动（空调/灯光/窗帘/电视/呼叫/与HIS联动）/IoT指标（报警量/响应时间/误报率/护士走路减少/护理满意度）。深海蓝 VI。
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
  smartBed: { offBedAlarm: number; position: number; turning: number; pressure: number; inBedDuration: number; nursingLink: number };
  infusion: { rate: number; volume: number; endAlarm: number; abnormal: number; nurseAlert: number };
  vitals: { bedsideMonitor: number; dynamicTemp: number; bp: number; spo2: number; autoEhr: number };
  environment: { temp: number; humidity: number; light: number; noise: number; airQuality: number; bedClean: number };
  smartCall: { priority: number; location: number; voice: number; video: number; carePathway: number };
  access: { wristband: number; location: number; patientSafety: number; wandering: number; staffTrack: number };
  deviceLinkage: { ac: number; light: number; curtain: number; tv: number; call: number; his: number };
  metrics: { alertVolume: number; responseTime: number; falseRate: number; walkReduction: number; satisfaction: number };
  suggestions: string[];
}

export default function SmartWardIoTV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/smart-ward-iot-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>智慧病房 IoT V5</Title>
        <Paragraph type="secondary">智能病床·离床报警·体位·翻身·压力·在床时长·护理站联动 / 输液监控·滴速·余量·结束报警·异常·自动提醒护士 / 生命体征采集·床头监护·动态体温·血压·SpO2·自动入病历</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="报警量" value={data.metrics.alertVolume} /></Card></Col>
              <Col span={6}><Card><Statistic title="响应时间" value={`${data.metrics.responseTime}min`} /></Card></Col>
              <Col span={6}><Card><Statistic title="误报率" value={`${data.metrics.falseRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="走路减少" value={`${data.metrics.walkReduction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>IoT 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "bed", name: "智能病床", value: `${data.smartBed.offBedAlarm}%` },
                  { key: "infusion", name: "输液监控", value: `${data.infusion.endAlarm}%` },
                  { key: "vitals", name: "体征采集", value: `${data.vitals.autoEhr}%` },
                  { key: "access", name: "腕带定位", value: `${data.access.wristband}%` },
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
