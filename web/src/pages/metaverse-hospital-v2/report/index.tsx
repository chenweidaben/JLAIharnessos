/**
 * 健澜科技 jlmedaios - 元宇宙医院 V2 页（M247-D）
 *
 * VR手术模拟技能评分认证导师评估/AR术中导航解剖叠加影像融合MR/数字人医生护士导诊/虚拟院区学术患者教育/VR康复疼痛脱敏。深海蓝 VI。
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
  vr: { surgerySim: number; rehab: number; painDistraction: number };
  ar: { intraopNav: number; anatomyOverlay: number; mr: number };
  digital: { doctors: number; nurses: number; guides: number };
  suggestions: string[];
}

export default function MetaverseHospitalV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/metaverse-hospital-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>元宇宙医院 VR/AR V2</Title>
        <Paragraph type="secondary">VR 手术模拟·技能评分·认证·导师评估 / AR 术中导航·解剖叠加·影像融合·MR / 数字人·医生·护士·导诊 / 虚拟院区·学术·患者教育 / VR 康复·疼痛脱敏</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="VR 手术模拟" value={data.vr.surgerySim} /></Card></Col>
              <Col span={6}><Card><Statistic title="疼痛脱敏" value={data.vr.painDistraction} /></Card></Col>
              <Col span={6}><Card><Statistic title="AR 术中导航" value={data.ar.intraopNav} /></Card></Col>
              <Col span={6}><Card><Statistic title="数字人医生" value={data.digital.doctors} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>元宇宙明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "rehab", name: "VR 康复", value: data.vr.rehab },
                  { key: "anatomyOverlay", name: "解剖叠加", value: data.ar.anatomyOverlay },
                  { key: "mr", name: "MR 混合现实", value: data.ar.mr },
                  { key: "nurses", name: "数字人护士", value: data.digital.nurses },
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
