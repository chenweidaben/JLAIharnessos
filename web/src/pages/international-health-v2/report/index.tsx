/**
 * 健澜科技 jlmedaios - 国际医疗合作 V2 页（M236-D）
 *
 * 国际医疗部/JCI/HIMSS国际认证/跨境会诊/国际转诊/海外体检/一带一路援外/多语言/国际保险直付。深海蓝 VI。
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
  dept: { intl: number; jci: boolean; himss: number };
  crossBorder: { consult: number; referral: number; overseasExam: number };
  bri: { aid: number; training: number };
  service: { multiLang: number; insuranceDirect: number };
  talent: { international: number };
  suggestions: string[];
}

export default function InternationalHealthV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/international-health-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>国际医疗合作 V2</Title>
        <Paragraph type="secondary">国际医疗部·JCI·HIMSS / 跨境会诊·国际转诊·海外体检 / 一带一路援外 / 多语言·国际保险直付</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国际部患者" value={data.dept.intl} /></Card></Col>
              <Col span={6}><Card><Statistic title="跨境会诊" value={data.crossBorder.consult} /></Card></Col>
              <Col span={6}><Card><Statistic title="海外体检" value={data.crossBorder.overseasExam} /></Card></Col>
              <Col span={6}><Card><Statistic title="国际保险直付" value={data.service.insuranceDirect} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>国际医疗明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "jci", name: "JCI 认证", value: data.dept.jci ? "已获" : "未获" },
                  { key: "referral", name: "国际转诊", value: data.crossBorder.referral },
                  { key: "bri", name: "一带一路援外", value: data.bri.aid },
                  { key: "lang", name: "多语言服务", value: data.service.multiLang },
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
