/**
 * 健澜科技 jlmedaios - 全院床位图（护理大屏）
 *
 * 按科室/楼层分组的床位网格：空床=绿 / 占床=蓝 / 隔离=橙 / 维护=灰。
 * 点击床位弹出患者信息（脱敏）。无真实床位时由后端返回 demo:true 演示行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Layout, Modal, Space, Spin, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { groupBedsByRoom, useBedMapStore } from '@/store/bedMapStore';
import {
  BED_STATUS_COLOR,
  BED_STATUS_LABEL,
  type BedMapRow,
  type BedMapStatus,
  type RoomGroup,
} from '@/types/bedMap';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface WardSection {
  wardName: string;
  department: string;
  floors: { floor: string; rooms: RoomGroup[] }[];
}

/** 把房间组再按科室（病区）-> 楼层聚合，供大屏分块渲染。 */
function groupByWard(groups: RoomGroup[]): WardSection[] {
  const wards = new Map<string, WardSection>();
  for (const g of groups) {
    let w = wards.get(g.wardName);
    if (!w) {
      w = { wardName: g.wardName, department: g.department, floors: [] };
      wards.set(g.wardName, w);
    }
    let floorBlock = w.floors.find((f) => f.floor === g.floor);
    if (!floorBlock) {
      floorBlock = { floor: g.floor, rooms: [] };
      w.floors.push(floorBlock);
    }
    floorBlock.rooms.push(g);
  }
  return [...wards.values()];
}

function BedTile({ bed, onClick }: { bed: BedMapRow; onClick: (b: BedMapRow) => void }) {
  const color = BED_STATUS_COLOR[bed.status];
  return (
    <div
      onClick={() => onClick(bed)}
      title={`${bed.roomNo}-${bed.bedNo}床 · ${BED_STATUS_LABEL[bed.status]}`}
      style={{
        width: 72,
        height: 60,
        borderRadius: 8,
        background: color,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        fontWeight: 600,
      }}
    >
      <span style={{ fontSize: 16 }}>{bed.bedNo}</span>
      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>床</span>
    </div>
  );
}

export default function BedMapPage() {
  const { loading, error, demo, rows, summary, updatedAt, load } = useBedMapStore();
  usePermission();
  const [selected, setSelected] = useState<BedMapRow | null>(null);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => groupBedsByRoom(rows), [rows]);
  const wards = useMemo(() => groupByWard(groups), [groups]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>全院床位图</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {demo && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="当前为演示数据"
            description="未检索到真实床位，展示内置演示行（覆盖空/占/隔离/维护四态）。"
          />
        )}

        <Space size="large" style={{ marginBottom: 16 }} wrap>
          {/* 图例 */}
          {(Object.keys(BED_STATUS_LABEL) as BedMapStatus[]).map((s) => (
            <Space key={s} size={6}>
              <span style={{
                display: 'inline-block', width: 14, height: 14,
                borderRadius: 3, background: BED_STATUS_COLOR[s],
              }} />
              <Text>{BED_STATUS_LABEL[s]}</Text>
            </Space>
          ))}
          {summary && (
            <Text type="secondary">
              共 {summary.total} 床｜空 {summary.available}｜占 {summary.occupied}
              ｜隔离 {summary.isolation}｜维护 {summary.maintenance}
            </Text>
          )}
          {updatedAt && <Text type="secondary">更新于 {new Date(updatedAt).toLocaleTimeString()}</Text>}
        </Space>

        <Spin spinning={loading}>
          {wards.map((w) => (
            <Card
              key={w.wardName}
              size="small"
              style={{ marginBottom: 16 }}
              title={<Space><Text strong>{w.wardName}</Text><Tag>{w.department}</Tag></Space>}
            >
              {w.floors.map((f) => (
                <div key={f.floor} style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ marginBottom: 8, display: 'inline-block' }}>
                    {f.floor} 楼
                  </Text>
                  <Space size={16} wrap>
                    {f.rooms.map((room) => (
                      <div key={room.key} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{room.roomNo} 房</Text>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {room.beds.map((bed) => (
                            <BedTile key={bed.bedId} bed={bed} onClick={setSelected} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </Space>
                </div>
              ))}
            </Card>
          ))}
        </Spin>
      </Content>

      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        title={selected ? `${selected.roomNo}-${selected.bedNo} 床` : ''}
      >
        {selected && (
          <Space direction="vertical" size="small">
            <Space>
              <Tag color={BED_STATUS_COLOR[selected.status]}>
                {BED_STATUS_LABEL[selected.status]}
              </Tag>
              <Text type="secondary">{selected.wardName} · {selected.department}</Text>
            </Space>
            {selected.patient ? (
              <>
                <Text>患者：{selected.patient.name}</Text>
                <Text>性别：{selected.patient.gender}
                  {selected.patient.age != null ? ` ｜ 年龄：${selected.patient.age}` : ''}
                </Text>
                <Text type="secondary">住院号(脱敏)：{selected.patient.patientId}</Text>
                {selected.occupiedAt && (
                  <Text type="secondary">占床时间：{new Date(selected.occupiedAt).toLocaleString()}</Text>
                )}
              </>
            ) : (
              <Text type="secondary">
                {selected.status === 'maintenance' ? '该床维护中，暂不可用。' : '该床空闲。'}
              </Text>
            )}
          </Space>
        )}
      </Modal>
    </Layout>
  );
}
