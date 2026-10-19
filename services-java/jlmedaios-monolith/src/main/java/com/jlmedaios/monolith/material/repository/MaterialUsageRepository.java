/*
 * 健澜科技 jlmedaios - 耗材消耗 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material.repository;

import com.jlmedaios.monolith.material.entity.MaterialUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 耗材消耗 Repository。
 */
@Repository
public interface MaterialUsageRepository extends JpaRepository<MaterialUsage, Long> {

    /**
     * 按患者 ID 查询消耗记录。
     *
     * @param patientId 患者 ID
     * @return 消耗记录列表
     */
    List<MaterialUsage> findByPatientId(Long patientId);

    /**
     * 按科室查询消耗记录。
     *
     * @param deptCode 科室编码
     * @return 消耗记录列表
     */
    List<MaterialUsage> findByDeptCode(String deptCode);
}
