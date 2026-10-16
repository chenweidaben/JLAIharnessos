/**
 * 健澜科技 jlmedaios - HRP V4 页（M250-D）
 *
 * 人事岗位招聘培训考勤排班薪酬绩效人才库/总账应收应付固定无形预算报表司库/药品耗材设备物资SPD采购库存追溯UDI/物业水电气被服餐饮车辆安全基建能耗/起草审批执行付款归档预警统计电子合同/基建设备信息化科研立项进度验收决算/人财物一体资源配置成本收益风险预测AI决策/HIS-EMR-HRP-财务-物流-主数据-FHIR一体化。深海蓝 VI。
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
  hr: { headcount: number; recruitment: number; training: number; payroll: number };
  finance: { gl: number; ar: number; ap: number; budget: number };
  supply: { pharmacy: number; consumable: number; equipment: number; udI: number };
  logistics: { utility: number; catering: number; vehicle: number; construction: number };
  contract: { draft: number; approval: number; payment: number; archive: number };
  project: { it: number; research: number; acceptance: number; settlement: number };
  suggestions: string[];
}

export default function HRPV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/hrp-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>HRP V4</Title>
        <Paragraph type="secondary">人事·岗位·招聘·培训·考勤·排班·薪酬·绩效 / 总账·应收·应付·固定·无形·预算·司库 / 药品·耗材·设备·SPD·采购·库存·UDI / 物业·水电气·被服·餐饮·车辆·基建·能耗 / 起草·审批·执行·付款·归档·电子合同 / 基建·设备·信息化·科研·立项·验收·决算 / 人财物一体·资源配置·成本收益·AI 决策 / HIS·EMR·HRP·财务·物流·主数据·FHIR 一体化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="人员" value={data.hr.headcount} /></Card></Col>
              <Col span={6}><Card><Statistic title="总账" value={data.finance.gl} prefix="万" /></Card></Col>
              <Col span={6}><Card><Statistic title="药品库存" value={data.supply.pharmacy} prefix="万" /></Card></Col>
              <Col span={6}><Card><Statistic title="合同归档" value={data.contract.archive} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>HRP 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "recruitment", name: "招聘", value: data.hr.recruitment },
                  { key: "budget", name: "预算", value: `${data.finance.budget}万` },
                  { key: "udI", name: "UDI", value: data.supply.udI },
                  { key: "construction", name: "基建", value: `${data.logistics.construction}万` },
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
