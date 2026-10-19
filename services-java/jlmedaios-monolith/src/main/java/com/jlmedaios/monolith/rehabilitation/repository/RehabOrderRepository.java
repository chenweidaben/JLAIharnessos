/*
 * 健澜科技 jlmedaios - 康复处方 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation.repository;

import com.jlmedaios.monolith.rehabilitation.entity.RehabOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 康复处方 Repository。
 */
@Repository
public interface RehabOrderRepository extends JpaRepository<RehabOrder, Long> {

    /**
     * 按状态查询康复处方。
     *
     * @param status 状态
     * @return 康复处方列表
     */
    List<RehabOrder> findByStatus(String status);

    /**
     * 按患者 ID 查询康复处方。
     *
     * @param patientId 患者 ID
     * @return 康复处方列表
     */
    List<RehabOrder> findByPatientId(String patientId);
}
