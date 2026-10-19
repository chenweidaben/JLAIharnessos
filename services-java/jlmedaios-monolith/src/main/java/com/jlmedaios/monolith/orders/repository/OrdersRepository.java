/*
 * 健澜科技 jlmedaios - 医嘱 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders.repository;

import com.jlmedaios.monolith.orders.entity.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 医嘱 Repository。
 */
@Repository
public interface OrdersRepository extends JpaRepository<Orders, Long> {
}
