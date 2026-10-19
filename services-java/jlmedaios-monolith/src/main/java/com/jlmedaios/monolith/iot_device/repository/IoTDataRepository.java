/*
 * 健澜科技 jlmedaios - IoT 采集数据 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.iot_device.repository;

import com.jlmedaios.monolith.iot_device.entity.IoTData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * IoT 采集数据 Repository。
 */
@Repository
public interface IoTDataRepository extends JpaRepository<IoTData, Long> {

    /**
     * 按设备编码查询 IoT 采集数据。
     *
     * @param deviceCode 设备编码
     * @return IoT 采集数据列表
     */
    List<IoTData> findByDeviceCode(String deviceCode);
}
