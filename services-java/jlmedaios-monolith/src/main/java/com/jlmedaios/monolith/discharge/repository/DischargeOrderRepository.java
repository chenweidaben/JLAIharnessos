/*
 * 健澜科技 jlmedaios - 出院医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.discharge.repository;

import com.jlmedaios.monolith.discharge.entity.DischargeOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 出院医嘱 Repository。
 */
@Repository
public interface DischargeOrderRepository extends JpaRepository<DischargeOrder, Long> {

    /**
     * 按就诊 ID 查询出院医嘱。
     *
     * @param visitId 就诊 ID
     * @return 出院医嘱 Optional
     */
    Optional<DischargeOrder> findByVisitId(Long visitId);
}
