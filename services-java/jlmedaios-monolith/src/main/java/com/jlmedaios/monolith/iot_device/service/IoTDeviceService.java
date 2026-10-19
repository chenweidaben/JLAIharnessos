/*
 * 健澜科技 jlmedaios - 物联网设备接入 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.iot_device.service;

import com.jlmedaios.monolith.iot_device.entity.IoTDevice;
import com.jlmedaios.monolith.iot_device.entity.IoTData;
import com.jlmedaios.monolith.iot_device.repository.IoTDeviceRepository;
import com.jlmedaios.monolith.iot_device.repository.IoTDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 物联网设备接入 Service。
 *
 * <p>IoT 设备主数据；生产接 MQTT/CoAP + 时序数据库 InfluxDB，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class IoTDeviceService {

    private final IoTDeviceRepository ioTDeviceRepository;
    private final IoTDataRepository ioTDataRepository;

    /**
     * 设备列表。
     *
     * @return IoT 设备列表
     */
    public List<IoTDevice> deviceList() {
        return ioTDeviceRepository.findAll();
    }

    /**
     * 设备实时数据。
     *
     * @param deviceCode 设备编码
     * @return IoT 采集数据列表
     */
    public List<IoTData> realTimeData(String deviceCode) {
        return ioTDataRepository.findByDeviceCode(deviceCode);
    }

    /**
     * 设备告警列表（status=FAULT 或数据异常）。
     *
     * @return IoT 设备列表
     */
    public List<IoTDevice> alertList() {
        return ioTDeviceRepository.findByStatus("FAULT");
    }
}
