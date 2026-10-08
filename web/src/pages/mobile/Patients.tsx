/**
 * 健澜科技 jlmedaios - 移动护理床位看板（M16-A）
 * 按病区列出在院患者卡片：床号 / 姓名 / 护理级别 / 风险标记 / 待办数；点击进入床旁工作台。
 * 数据来自真实 BFF（/m/bed-board），无假数据；健康门禁由 MobileLayout 统一处理。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Tag, Spin, Empty } from 'antd';
import { AlertOutlined } from '@ant-design/icons';

import { useMobileNursingStore } from '@/store/mobileNursingStore';
import type { BedBoardPatient } from '@/types/mobileNursing';

const NURSING_LEVEL_LABEL: Record<string, string> = {
  special: '特级',
  level1: '一级',
  level2: '二级',
  level3: '三级',
};

const RISK_COLOR: Record<string, string> = {
  none: 'green',
  low: 'blue',
  medium: 'orange',
  high: 'red',
};

function PatientCard({ p }: { p: BedBoardPatient }) {
  const navigate = useNavigate();
  return (
    <Card
      data-testid={`m-patient-${p.visitId}`}
      size="small"
      style={{ marginBottom: 8 }}
      onClick={() => navigate(`/m/bed/${p.visitId}`)}
      hoverable
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 600, marginRight: 8 }}>{p.bedNo || '—'}</span>
          <span style={{ fontSize: 16, marginRight: 8 }}>{p.patientName}</span>
          <Tag color="blue">{NURSING_LEVEL_LABEL[p.nursingLevel] ?? p.nursingLevel}</Tag>
        </div>
        <Tag data-testid={`m-patient-todo-${p.visitId}`} color={p.pendingTaskCount > 0 ? 'orange' : 'default'}>
          待办 {p.pendingTaskCount}
        </Tag>
      </div>
      {(p.pressureSoreRisk === 'medium' ||
        p.pressureSoreRisk === 'high' ||
        p.fallRisk === 'medium' ||
        p.fallRisk === 'high') && (
        <div style={{ marginTop: 6 }}>
          {p.pressureSoreRisk === 'high' && (
            <Tag color={RISK_COLOR.pressureSoreRisk === 'red' ? 'red' : 'orange'} icon={<AlertOutlined />}>
              压疮高危
            </Tag>
          )}
          {p.fallRisk === 'high' && (
            <Tag color="red" icon={<AlertOutlined />}>
              跌倒高危
            </Tag>
          )}
        </div>
      )}
    </Card>
  );
}

export default function MobilePatients() {
  const { patients, loadingBoard, loadBoard, dbUp } = useMobileNursingStore();

  useEffect(() => {
    if (dbUp) void loadBoard();
  }, [dbUp, loadBoard]);

  return (
    <Spin spinning={loadingBoard}>
      {patients.length === 0 && !loadingBoard ? (
        <Empty description="本病区暂无在院患者" />
      ) : (
        <List
          dataSource={patients}
          renderItem={(p) => (
            <List.Item style={{ borderBottom: 'none', padding: 0 }}>
              <div style={{ width: '100%' }}>
                <PatientCard p={p} />
              </div>
            </List.Item>
          )}
        />
      )}
    </Spin>
  );
}
