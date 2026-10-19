/*
 * 健澜科技 jlmedaios - 设备 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment_management.repository;

import com.jlmedaios.monolith.equipment_management.entity.MedicalEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 设备 Repository。
 */
@Repository
public interface MedicalEquipmentRepository extends JpaRepository<MedicalEquipment, Long> {

    /**
     * 按科室查询设备。
     *
     * @param department 科室
     * @return 设备列表
     */
    List<MedicalEquipment> findByDepartment(String department);

    /**
     * 按保修到期日期查询设备。
     *
     * @param date 日期
     * @return 设备列表
     */
    List<MedicalEquipment> findByWarrantyEndDateBefore(LocalDate date);
}
