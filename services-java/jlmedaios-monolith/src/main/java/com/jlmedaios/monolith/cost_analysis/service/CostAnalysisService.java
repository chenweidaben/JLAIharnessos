/*
 * 健澜科技 jlmedaios - 成本核算 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.cost_analysis.service;

import com.jlmedaios.monolith.cost_analysis.entity.CostItem;
import com.jlmedaios.monolith.cost_analysis.repository.CostItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 成本核算 Service。
 *
 * <p>append-only: 成本记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class CostAnalysisService {

    private final CostItemRepository costItemRepository;

    /**
     * 记录成本。
     *
     * @param costCode   成本编码
     * @param costName   成本名称
     * @param category   类别
     * @param amount     金额
     * @param department 科室
     * @param period     周期
     * @return 已持久化的成本记录
     */
    public CostItem record(String costCode, String costName, String category,
                           BigDecimal amount, String department, String period) {
        CostItem item = CostItem.builder()
                .costCode(costCode)
                .costName(costName)
                .category(category)
                .amount(amount)
                .department(department)
                .period(period)
                .build();
        return costItemRepository.save(item);
    }

    /**
     * 科室成本汇总。
     *
     * @param department 科室
     * @return 成本记录列表
     */
    public List<CostItem> deptSummary(String department) {
        return costItemRepository.findByDepartment(department);
    }

    /**
     * 成本结构分析（mock）。
     *
     * @return 分析数据
     */
    public Map<String, Object> analysis() {
        Map<String, Object> analysis = new HashMap<>();
        analysis.put("drug_ratio", new BigDecimal("0.35"));
        analysis.put("material_ratio", new BigDecimal("0.20"));
        analysis.put("labor_ratio", new BigDecimal("0.30"));
        return analysis;
    }
}
