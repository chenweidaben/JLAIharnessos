/**
 * 健澜科技 jlmedaios - 脑机接口 V2 页（M247-B）
 *
 * 侵入非侵入脑电采集信号解码神经反馈BCI控制/TMS/tDCS/VNS/DBS经颅超声/上肢下肢外骨骼手功能步态/Fugl-Meyer EMG/卒中脊髓AI远程康复。深海蓝 VI。
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
  bci: { invasive: number; nonInvasive: number; decoding: number };
  stimulation: { tms: number; tdcs: number; dbs: number };
  robotics: { exoskeleton: number; hand: number; gait: number };
  suggestions: string[];
}

export default function BCINeuroRehabV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/bci-neuro-rehab-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>脑机接口神经康复 V2</Title>
        <Paragraph type="secondary">侵入·非侵入·脑电采集·信号解码·神经反馈·BCI 控制 / TMS·tDCS·VNS·DBS·经颅超声 / 上肢·下肢·外骨骼·手功能·步态 / Fugl-Meyer·EMG / 卒中·脊髓·AI 远程康复</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="非侵入 BCI" value={data.bci.nonInvasive} /></Card></Col>
              <Col span={6}><Card><Statistic title="解码准确率" value={`${data.bci.decoding}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="TMS" value={data.stimulation.tms} /></Card></Col>
              <Col span={6}><Card><Statistic title="外骨骼" value={data.robotics.exoskeleton} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>康复明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "invasive", name: "侵入式", value: data.bci.invasive },
                  { key: "tdcs", name: "tDCS", value: data.stimulation.tdcs },
                  { key: "hand", name: "手功能", value: data.robotics.hand },
                  { key: "gait", name: "步态训练", value: data.robotics.gait },
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
