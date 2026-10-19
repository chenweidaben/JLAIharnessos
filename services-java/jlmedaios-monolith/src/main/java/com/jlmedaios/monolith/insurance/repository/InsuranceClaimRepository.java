/*
 * 健澜科技 jlmedaios - 医保结算 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance.repository;

import com.jlmedaios.monolith.insurance.entity.InsuranceClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医保结算 Repository。
 */
@Repository
public interface InsuranceClaimRepository extends JpaRepository<InsuranceClaim, Long> {

    /**
     * 按就诊 ID 查询医保结算列表。
     *
     * @param visitId 就诊 ID
     * @return 医保结算列表
     */
    List<InsuranceClaim> findByVisitId(Long visitId);

    /**
     * 按状态查询医保结算列表。
     *
     * @param status 状态
     * @return 医保结算列表
     */
    List<InsuranceClaim> findByStatus(String status);
}
