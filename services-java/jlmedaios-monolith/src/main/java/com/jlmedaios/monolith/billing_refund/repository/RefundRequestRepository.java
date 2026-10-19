/*
 * 健澜科技 jlmedaios - 退费申请 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_refund.repository;

import com.jlmedaios.monolith.billing_refund.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 退费申请 Repository。
 */
@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    /**
     * 按状态查询退费申请。
     *
     * @param status 状态
     * @return 退费申请列表
     */
    List<RefundRequest> findByStatus(String status);

    /**
     * 按患者 ID 查询退费申请。
     *
     * @param patientId 患者 ID
     * @return 退费申请列表
     */
    List<RefundRequest> findByPatientId(String patientId);
}
