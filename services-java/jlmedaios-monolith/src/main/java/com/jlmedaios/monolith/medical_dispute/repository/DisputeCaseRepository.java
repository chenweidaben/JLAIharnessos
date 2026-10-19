/*
 * 健澜科技 jlmedaios - 医疗纠纷 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_dispute.repository;

import com.jlmedaios.monolith.medical_dispute.entity.DisputeCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医疗纠纷 Repository。
 */
@Repository
public interface DisputeCaseRepository extends JpaRepository<DisputeCase, Long> {

    /**
     * 按状态查询纠纷案件。
     *
     * @param status 状态
     * @return 纠纷案件列表
     */
    List<DisputeCase> findByStatus(String status);

    /**
     * 按纠纷类型查询纠纷案件。
     *
     * @param disputeType 纠纷类型
     * @return 纠纷案件列表
     */
    List<DisputeCase> findByDisputeType(String disputeType);
}
