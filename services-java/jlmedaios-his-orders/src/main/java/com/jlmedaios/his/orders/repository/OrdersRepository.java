/*
 * 健澜科技 jlmedaios - 医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.orders.repository;

import com.jlmedaios.his.orders.entity.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医嘱 Repository。
 */
@Repository
public interface OrdersRepository extends JpaRepository<Orders, Long> {

    /**
     * 按患者 ID 查询医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 医嘱列表
     */
    List<Orders> findByPatientId(Long patientId);
}
