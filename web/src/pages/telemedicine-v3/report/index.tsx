/**
 * 健澜科技 jlmedaios - 远程医疗 V3 页（M234-B）
 *
 * MDT远程会诊/远程查房/远程CT/MRI/DR读片/病理数字切片/远程心电超声/教学/重症监护。深海蓝 VI。
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
  consult: { mdt: number; wardRound: number };
  imaging: { ct: number; mri: number; dr: number };
  pathology: { digitalSlide: number };
  ecg: { remote: number };
  ultrasound: { remote: number };
  teaching: { sessions: number };
  critical: { monitored: number };
  suggestions: string[];
}

export default function TelemedicineV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/telemedicine-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>远程医疗 V3</Title>
        <Paragraph type="secondary">MDT 远程会诊·远程查房 / 远程 CT·MRI·DR 读片 / 病理数字切片 / 远程心电·超声 / 教学·重症监护</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="MDT 会诊" value={data.consult.mdt} /></Card></Col>
              <Col span={6}><Card><Statistic title="远程CT读片" value={data.imaging.ct} /></Card></Col>
              <Col span={6}><Card><Statistic title="病理数字切片" value={data.pathology.digitalSlide} /></Card></Col>
              <Col span={6}><Card><Statistic title="远程心电" value={data.ecg.remote} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>远程医疗明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ward", name: "远程查房", value: data.consult.wardRound },
                  { key: "mri", name: "远程MRI读片", value: data.imaging.mri },
                  { key: "dr", name: "远程DR读片", value: data.imaging.dr },
                  { key: "teach", name: "远程教学", value: data.teaching.sessions },
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
