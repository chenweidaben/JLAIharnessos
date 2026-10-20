/*
 * 健澜科技 jlmedaios - 危急值 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.critical.repository;

import com.jlmedaios.monolith.critical.entity.CriticalValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 危急值 Repository。
 */
@Repository
public interface CriticalValueRepository extends JpaRepository<CriticalValue, Long> {

    /**
     * 按状态查询危急值列表。
     *
     * @param status 状态
     * @return 危急值列表
     */
    List<CriticalValue> findByStatus(String status);

    /**
     * 按患者 ID 查询危急值列表。
     *
     * @param patientId 患者 ID
     * @return 危急值列表
     */
    List<CriticalValue> findByPatientId(Long patientId);

    /**
     * 查询未闭环危急值（P5 性能优化：替代 findAll().filter()）。
     *
     * @param status 排除的状态
     * @return 危急值列表
     */
    List<CriticalValue> findByStatusNot(String status);
}
