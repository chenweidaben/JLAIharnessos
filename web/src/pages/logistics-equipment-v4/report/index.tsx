/**
 * 健澜科技 jlmedaios - 后勤设备 V4 页（M254-D）
 *
 * 计划采购验收使用维保计量报废更新预测性维护/诊断治疗监护急救手术影像设备台账档案/开机率使用率故障率收益率阳性率成本回收分析/强制检定周期检定校准标签不合格计量档案/高值低值植入物试剂敷料SPD延伸柜智能柜UDI/物业水电气被服餐饮车辆安全基建能耗碳排放/电气安全辐射安全生物安全设备报警预防性维护/工单巡检能耗监测智能报修后勤驾驶舱绿色医院。深海蓝 VI。
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
  lifecycle: { plan: number; purchase: number; accept: number; use: number; maintenance: number; metrology: number; scrap: number; update: number };
  equipment: { diagnostic: number; therapeutic: number; monitor: number; emergency: number; surgery: number; imaging: number };
  benefit: { uptime: number; utilization: number; failure: number; yield: number; positiveRate: number; payback: number };
  metrology: { forced: number; periodic: number; calibration: number; tag: number; nonconforming: number };
  spd: { highValue: number; lowValue: number; implant: number; reagent: number; dressing: number; smartCabinet: number; udi: number };
  logistics: { utility: number; water: number; power: number; laundry: number; catering: number; vehicle: number; safety: number; infra: number; carbon: number };
  safety: { electrical: number; radiation: number; biosafety: number; alarm: number; preventive: number };
  management: { workOrder: number; inspection: number; energyMonitor: number; smartRepair: number; dashboard: number; greenHospital: number };
  suggestions: string[];
}

export default function LogisticsEquipmentV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/logistics-equipment-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>后勤设备 V4</Title>
        <Paragraph type="secondary">计划·采购·验收·使用·维保·计量·报废·更新 / 诊断·治疗·监护·急救·手术·影像·台账 / 开机率·使用率·故障率·收益率·成本回收 / 强制检定·周期检定·校准·标签·不合格 / 高值·低值·植入物·试剂·敷料·SPD·UDI / 物业·水电气·被服·餐饮·车辆·基建·碳排放 / 电气安全·辐射安全·生物安全·报警·预防性维护 / 工单·巡检·能耗监测·智能报修·驾驶舱·绿色医院</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="设备总数" value={data.equipment.diagnostic + data.equipment.therapeutic} /></Card></Col>
              <Col span={6}><Card><Statistic title="开机率" value={`${data.benefit.uptime}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="碳排放" value={data.logistics.carbon} prefix="吨" /></Card></Col>
              <Col span={6}><Card><Statistic title="工单" value={data.management.workOrder} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>设备明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "utilization", name: "使用率", value: `${data.benefit.utilization}%` },
                  { key: "metrology", name: "计量检定", value: data.metrology.forced },
                  { key: "udi", name: "UDI 追溯", value: data.spd.udi },
                  { key: "greenHospital", name: "绿色医院评分", value: `${data.management.greenHospital}%` },
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
