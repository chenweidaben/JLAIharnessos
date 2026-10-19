/*
 * 健澜科技 jlmedaios - 物联网设备接入 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.iot_device.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.iot_device.entity.IoTDevice;
import com.jlmedaios.monolith.iot_device.entity.IoTData;
import com.jlmedaios.monolith.iot_device.service.IoTDeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 物联网设备接入 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/iot")
public class IoTDeviceController {

    private final IoTDeviceService ioTDeviceService;

    /**
     * 设备列表。
     *
     * @return Result<List<IoTDevice>>
     */
    @GetMapping("/devices")
    public Result<List<IoTDevice>> deviceList() {
        return Result.ok(ioTDeviceService.deviceList());
    }

    /**
     * 设备实时数据。
     *
     * @param deviceCode 设备编码
     * @return Result<List<IoTData>>
     */
    @GetMapping("/device/{deviceCode}/data")
    public Result<List<IoTData>> realTimeData(@PathVariable String deviceCode) {
        return Result.ok(ioTDeviceService.realTimeData(deviceCode));
    }

    /**
     * 设备告警列表。
     *
     * @return Result<List<IoTDevice>>
     */
    @GetMapping("/alerts")
    public Result<List<IoTDevice>> alertList() {
        return Result.ok(ioTDeviceService.alertList());
    }
}
