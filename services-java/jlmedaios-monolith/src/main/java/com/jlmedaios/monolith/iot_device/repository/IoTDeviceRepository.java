/*
 * 健澜科技 jlmedaios - IoT 设备 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.iot_device.repository;

import com.jlmedaios.monolith.iot_device.entity.IoTDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * IoT 设备 Repository。
 */
@Repository
public interface IoTDeviceRepository extends JpaRepository<IoTDevice, Long> {

    /**
     * 按状态查询 IoT 设备。
     *
     * @param status 状态
     * @return IoT 设备列表
     */
    List<IoTDevice> findByStatus(String status);

    /**
     * 按科室查询 IoT 设备。
     *
     * @param department 科室
     * @return IoT 设备列表
     */
    List<IoTDevice> findByDepartment(String department);
}
