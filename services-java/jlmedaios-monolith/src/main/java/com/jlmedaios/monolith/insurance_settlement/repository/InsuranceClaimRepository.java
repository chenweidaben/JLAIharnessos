/*
 * 健澜科技 jlmedaios - 医保结算 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance_settlement.repository;

import com.jlmedaios.monolith.insurance_settlement.entity.InsuranceClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医保结算 Repository。
 */
@Repository
public interface InsuranceClaimRepository extends JpaRepository<InsuranceClaim, Long> {

    /**
     * 按状态查询医保结算。
     *
     * @param claimStatus 状态
     * @return 医保结算列表
     */
    List<InsuranceClaim> findByClaimStatus(String claimStatus);

    /**
     * 按患者 ID 查询医保结算。
     *
     * @param patientId 患者 ID
     * @return 医保结算列表
     */
    List<InsuranceClaim> findByPatientId(String patientId);
}
