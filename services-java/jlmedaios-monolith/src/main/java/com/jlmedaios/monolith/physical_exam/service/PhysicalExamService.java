/*
 * 健澜科技 jlmedaios - 体检管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.physical_exam.service;

import com.jlmedaios.monolith.physical_exam.entity.PhysicalExamOrder;
import com.jlmedaios.monolith.physical_exam.repository.PhysicalExamOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 体检管理 Service。
 *
 * <p>append-only: 体检订单不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class PhysicalExamService {

    private final PhysicalExamOrderRepository physicalExamOrderRepository;

    /**
     * 创建体检订单。
     *
     * @param customerName 客户姓名
     * @param age          年龄
     * @param gender       性别
     * @param examPackage  体检套餐
     * @param totalFee     总费用
     * @return 已持久化的体检订单
     */
    public PhysicalExamOrder order(String customerName, Integer age, String gender,
                                    String examPackage, BigDecimal totalFee) {
        PhysicalExamOrder order = PhysicalExamOrder.builder()
                .customerName(customerName)
                .age(age)
                .gender(gender)
                .examPackage(examPackage)
                .totalFee(totalFee)
                .build();
        return physicalExamOrderRepository.save(order);
    }

    /**
     * 完成体检（设 status=COMPLETED）。
     *
     * @param id 订单 ID
     * @return 已更新的体检订单
     */
    public Optional<PhysicalExamOrder> complete(Long id) {
        Optional<PhysicalExamOrder> opt = physicalExamOrderRepository.findById(id);
        if (opt.isPresent()) {
            PhysicalExamOrder order = opt.get();
            order.setStatus("COMPLETED");
            order.setUpdatedAt(LocalDateTime.now());
            physicalExamOrderRepository.save(order);
        }
        return opt;
    }

    /**
     * 今日体检队列。
     *
     * @return 体检订单列表
     */
    public List<PhysicalExamOrder> todayList() {
        return physicalExamOrderRepository.findByOrderDate(LocalDate.now());
    }
}
