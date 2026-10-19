/*
 * 健澜科技 jlmedaios - 医务人员 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin.repository;

import com.jlmedaios.monolith.admin.entity.MedicalStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医务人员 Repository。
 */
@Repository
public interface MedicalStaffRepository extends JpaRepository<MedicalStaff, Long> {

    /**
     * 按科室查询医务人员列表。
     *
     * @param dept 科室
     * @return 医务人员列表
     */
    List<MedicalStaff> findByDept(String dept);

    /**
     * 按人员类型查询医务人员列表。
     *
     * @param employeeType 人员类型（医师/护士/药师/技师）
     * @return 医务人员列表
     */
    List<MedicalStaff> findByEmployeeType(String employeeType);
}
