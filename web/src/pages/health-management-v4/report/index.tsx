/**
 * 健澜科技 jlmedaios - 健康管理 V4 页（M253-B）
 *
 * 个人家庭动态更新互联互通隐私保护档案/高血压糖尿病冠心病脑卒中哮喘控制率并发症/套餐预约检中报告解读阳性随访慢病AI解读/免疫规划二类接种记录不良反应冷链预约/孕前孕期产后儿童妇女两癌筛查儿童保健/老年评估慢病用药营养心理长期照护安宁/健康讲座手册新媒体咨询自我管理/体检中心健康门诊慢病门诊VIP企业团检AI。深海蓝 VI。
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
  records: { personal: number; family: number; dynamic: number; privacy: number };
  chronic: { htn: number; dm: number; chd: number; stroke: number; controlRate: number };
  checkup: { package: number; booking: number; report: number; positive: number };
  immunization: { vaccine: number; coldChain: number; adverse: number };
  womenChild: { preconception: number; pregnancy: number; twoCancer: number; childCare: number };
  geriatric: { assessment: number; medication: number; nutrition: number; hospice: number };
  education: { lecture: number; handbook: number; newMedia: number; selfMgmt: number };
  center: { checkupCenter: number; chronicClinic: number; vip: number; corporate: number };
  suggestions: string[];
}

export default function HealthManagementV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/health-management-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>健康管理 V4</Title>
        <Paragraph type="secondary">个人·家庭·动态·互联互通·隐私档案 / 高血压·糖尿病·冠心病·脑卒中·控制率 / 套餐·预约·报告解读·阳性随访·AI / 免疫规划·二类疫苗·冷链·不良反应 / 孕前·孕期·产后·两癌筛查·儿童保健 / 老年评估·慢病用药·营养·长期照护·安宁 / 健康讲座·手册·新媒体·自我管理 / 体检中心·慢病门诊·VIP·企业团检</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="健康档案" value={data.records.personal} /></Card></Col>
              <Col span={6}><Card><Statistic title="高血压" value={data.chronic.htn} /></Card></Col>
              <Col span={6}><Card><Statistic title="慢病控制率" value={`${data.chronic.controlRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="体检" value={data.checkup.package} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>健康管理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "family", name: "家庭档案", value: data.records.family },
                  { key: "positive", name: "阳性随访", value: data.checkup.positive },
                  { key: "twoCancer", name: "两癌筛查", value: data.womenChild.twoCancer },
                  { key: "newMedia", name: "新媒体传播", value: data.education.newMedia },
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
