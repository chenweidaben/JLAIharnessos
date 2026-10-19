/*
 * 健澜科技 jlmedaios - 物联网设备接入 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.iot_device;

import com.jlmedaios.monolith.iot_device.entity.IoTDevice;
import com.jlmedaios.monolith.iot_device.entity.IoTData;
import com.jlmedaios.monolith.iot_device.service.IoTDeviceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 物联网设备接入 Service 测试。
 */
@SpringBootTest
public class IoTDeviceServiceTest {

    @Autowired
    private IoTDeviceService ioTDeviceService;

    @Test
    void testDeviceList() {
        List<IoTDevice> list = ioTDeviceService.deviceList();
        assertNotNull(list);
    }

    @Test
    void testRealTimeData() {
        List<IoTData> data = ioTDeviceService.realTimeData("监护仪-ICU-01");
        assertNotNull(data);
    }

    @Test
    void testAlertList() {
        List<IoTDevice> alerts = ioTDeviceService.alertList();
        assertNotNull(alerts);
    }
}
