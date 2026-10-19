/*
 * 健澜科技 jlmedaios - 医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders_management.repository;

import com.jlmedaios.monolith.orders_management.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医嘱 Repository。
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * 按患者 ID 查询医嘱。
     *
     * @param patientId 患者 ID
     * @return 医嘱列表
     */
    List<Order> findByPatientId(String patientId);

    /**
     * 按状态查询医嘱。
     *
     * @param status 状态
     * @return 医嘱列表
     */
    List<Order> findByStatus(String status);
}
