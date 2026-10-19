/*
 * 健澜科技 jlmedaios - 院感病例 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.infection_control.repository;

import com.jlmedaios.monolith.infection_control.entity.InfectionCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 院感病例 Repository。
 */
@Repository
public interface InfectionCaseRepository extends JpaRepository<InfectionCase, Long> {

    /**
     * 按科室查询院感病例。
     *
     * @param deptCode 科室编码
     * @return 院感病例列表
     */
    List<InfectionCase> findByDeptCode(String deptCode);

    /**
     * 按状态查询院感病例。
     *
     * @param status 状态
     * @return 院感病例列表
     */
    List<InfectionCase> findByStatus(String status);
}
