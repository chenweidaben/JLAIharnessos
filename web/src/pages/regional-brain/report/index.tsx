/**
 * 健澜科技 jlmedaios - 区域健康大脑页（M232-D）
 *
 * 区域医联体/医共体/专科联盟/分级诊疗/双向转诊/基层首诊/区域影像检验病理中心互认/区域卫生信息平台/监管/互联网医院。深海蓝 VI。
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
  alliance: { unions: number; consortia: number; specialtyAlliances: number };
  referral: { primaryCare: number; twoWay: number };
  centers: { imaging: boolean; lab: boolean; pathology: boolean; mutualRecognition: boolean };
  platform: { healthInfo: boolean; supervision: boolean; internetHospital: boolean };
  suggestions: string[];
}

export default function RegionalBrainPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/regional-brain/report");
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
        <Title level={3} style={{ color: VI.deep }}>区域健康大脑</Title>
        <Paragraph type="secondary">医联体·医共体·专科联盟 / 分级诊疗·双向转诊·基层首诊 / 区域影像·检验·病理中心互认 / 卫生信息平台·监管·互联网医院</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医联体" value={data.alliance.unions} /></Card></Col>
              <Col span={6}><Card><Statistic title="基层首诊" value={data.referral.primaryCare} /></Card></Col>
              <Col span={6}><Card><Statistic title="双向转诊" value={data.referral.twoWay} /></Card></Col>
              <Col span={6}><Card><Statistic title="专科联盟" value={data.alliance.specialtyAlliances} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>区域中心明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "img", name: "区域影像中心", value: data.centers.imaging ? "已建成" : "未建成" },
                  { key: "lab", name: "区域检验中心", value: data.centers.lab ? "已建成" : "未建成" },
                  { key: "path", name: "区域病理中心", value: data.centers.pathology ? "已建成" : "未建成" },
                  { key: "mutual", name: "检查检验互认", value: data.centers.mutualRecognition ? "已实现" : "未实现" },
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
