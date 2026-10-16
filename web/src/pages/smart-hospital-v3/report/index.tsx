/**
 * 健澜科技 jlmedaios - 智慧医院 V3 页（M231-A）
 *
 * 智慧医疗（CDSS/临床路径/闭环/AI辅助）/智慧服务（预约导航报告支付随访线上线下融合）/智慧管理（HRP/成本绩效/物流设备/决策支持）/三位一体评级/智慧大脑/智慧病房/智慧门诊/智慧后勤。深海蓝 VI。
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
  medical: { cdss: boolean; closedLoop: boolean; ai: number };
  service: { online: boolean; appointment: number; followup: number };
  management: { hrp: boolean; cost: boolean; logistics: number };
  trinity: { rating: string };
  brain: { platform: boolean };
  ward: { smart: boolean };
  outpatient: { smart: boolean };
  logistics: { smart: boolean };
  suggestions: string[];
}

export default function SmartHospitalV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/smart-hospital-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>智慧医院 V3</Title>
        <Paragraph type="secondary">智慧医疗·智慧服务·智慧管理三位一体 / CDSS·临床路径·闭环医嘱 / 智慧大脑·智慧病房·智慧门诊·智慧后勤</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="三位一体评级" value={data.trinity.rating} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 应用数" value={data.medical.ai} /></Card></Col>
              <Col span={6}><Card><Statistic title="预约率" value={`${data.service.appointment}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="智慧物流" value={data.management.logistics} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>智慧医院明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "cdss", name: "CDSS 临床决策", value: data.medical.cdss ? "已部署" : "未部署" },
                  { key: "closed", name: "医嘱闭环", value: data.medical.closedLoop ? "已实现" : "未实现" },
                  { key: "brain", name: "智慧大脑平台", value: data.brain.platform ? "已建成" : "未建成" },
                  { key: "ward", name: "智慧病房", value: data.ward.smart ? "已覆盖" : "未覆盖" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "状态", dataIndex: "value", key: "value" },
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
