/*
 * 健澜科技 jlmedaios - 体检订单 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.physical_exam.repository;

import com.jlmedaios.monolith.physical_exam.entity.PhysicalExamOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 体检订单 Repository。
 */
@Repository
public interface PhysicalExamOrderRepository extends JpaRepository<PhysicalExamOrder, Long> {

    /**
     * 按订单日期查询体检订单。
     *
     * @param date 日期
     * @return 体检订单列表
     */
    List<PhysicalExamOrder> findByOrderDate(LocalDate date);

    /**
     * 按状态查询体检订单。
     *
     * @param status 状态
     * @return 体检订单列表
     */
    List<PhysicalExamOrder> findByStatus(String status);
}
