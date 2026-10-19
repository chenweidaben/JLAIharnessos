/*
 * 健澜科技 jlmedaios - 设备维护记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment_management.repository;

import com.jlmedaios.monolith.equipment_management.entity.EquipmentMaintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 设备维护记录 Repository。
 */
@Repository
public interface EquipmentMaintenanceRepository extends JpaRepository<EquipmentMaintenance, Long> {

    /**
     * 按设备编码查询维护记录。
     *
     * @param equipmentCode 设备编码
     * @return 维护记录列表
     */
    List<EquipmentMaintenance> findByEquipmentCode(String equipmentCode);
}
