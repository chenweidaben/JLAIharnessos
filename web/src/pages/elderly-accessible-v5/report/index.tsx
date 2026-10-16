/**
 * 健澜科技 jlmedaios - 适老化与无障碍服务 V5 页（M261-C）
 *
 * 大字版语音引导志愿者陪诊绿色通道家属代办/无障碍通道卫生间低位窗口盲道手语翻译/屏幕阅读器高对比度语音交互字幕简化界面/家庭病床上门巡诊远程监测家属同步用药提醒/多重用药剂量认知障碍依从性家属监护/线下窗口人工客服现金支付纸质报告家属账号/全国示范评估培训改造持续改进/老年患者满意度无障碍设施数字服务使用率投诉。深海蓝 VI。
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
  elderlyService: { largeFont: number; voiceGuide: number; volunteer: number; greenChannel: number; familyProxy: number };
  barrierFree: { route: number; toilet: number; lowWindow: number; braille: number; signLanguage: number };
  digitalAccess: { screenReader: number; highContrast: number; voiceInteraction: number; subtitle: number; simpleUI: number };
  homeCare: { homebed: number; homeVisit: number; remoteMonitoring: number; familySync: number; medReminder: number };
  polypharmacy: { polypharmacy: number; dose: number; cognitive: number; adherence: number; familyMonitoring: number };
  offline: { window: number; human: number; cash: number; paperReport: number; familyAccount: number };
  national: { demo: number; assessment: number; training: number; renovation: number; continuous: number };
  metrics: { seniorSatisfaction: number; accessibilityFacility: number; digitalUsage: number; complaint: number };
  suggestions: string[];
}

export default function ElderlyAccessibleV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/elderly-accessible-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>适老化与无障碍服务 V5</Title>
        <Paragraph type="secondary">大字版·语音引导·志愿者陪诊·绿色通道·家属代办 / 无障碍通道·卫生间·低位窗口·盲道·手语翻译 / 屏幕阅读器·高对比度·语音交互·字幕·简化界面 / 家庭病床·上门巡诊·远程监测·家属同步·用药提醒</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="老年满意度" value={`${data.metrics.seniorSatisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="无障碍设施" value={`${data.metrics.accessibilityFacility}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="数字服务使用率" value={`${data.metrics.digitalUsage}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉率" value={`${data.metrics.complaint}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>适老化明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "largeFont", name: "大字版", value: `${data.elderlyService.largeFont}%` },
                  { key: "greenChannel", name: "绿色通道", value: `${data.elderlyService.greenChannel}%` },
                  { key: "homebed", name: "家庭病床", value: data.homeCare.homebed },
                  { key: "signLanguage", name: "手语翻译", value: `${data.barrierFree.signLanguage}%` },
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
