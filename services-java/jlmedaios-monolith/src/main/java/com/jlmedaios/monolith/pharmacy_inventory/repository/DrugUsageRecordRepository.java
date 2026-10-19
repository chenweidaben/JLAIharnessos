/*
 * 健澜科技 jlmedaios - 药品消耗记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_inventory.repository;

import com.jlmedaios.monolith.pharmacy_inventory.entity.DrugUsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 药品消耗记录 Repository。
 */
@Repository
public interface DrugUsageRecordRepository extends JpaRepository<DrugUsageRecord, Long> {

    /**
     * 按药品编码查询消耗记录。
     *
     * @param drugCode 药品编码
     * @return 消耗记录列表
     */
    List<DrugUsageRecord> findByDrugCode(String drugCode);

    /**
     * 按科室查询消耗记录。
     *
     * @param departmentCode 科室编码
     * @return 消耗记录列表
     */
    List<DrugUsageRecord> findByDepartmentCode(String departmentCode);
}
