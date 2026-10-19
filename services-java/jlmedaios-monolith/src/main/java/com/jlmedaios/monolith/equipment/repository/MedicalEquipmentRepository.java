/*
 * 健澜科技 jlmedaios - 医疗设备 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment.repository;

import com.jlmedaios.monolith.equipment.entity.MedicalEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 医疗设备 Repository。
 */
@Repository
public interface MedicalEquipmentRepository extends JpaRepository<MedicalEquipment, Long> {

    /**
     * 按科室查询设备。
     *
     * @param deptCode 科室编码
     * @return 设备列表
     */
    List<MedicalEquipment> findByDeptCode(String deptCode);

    /**
     * 按保养日期查询待保养设备。
     *
     * @param date 截止日期
     * @return 待保养设备列表
     */
    List<MedicalEquipment> findByNextMaintenanceDateBefore(LocalDate date);
}
