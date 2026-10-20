/*
 * 健澜科技 jlmedaios - 耗材管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material_management.service;

import com.jlmedaios.monolith.material_management.entity.Consumable;
import com.jlmedaios.monolith.material_management.entity.ConsumableUsage;
import com.jlmedaios.monolith.material_management.repository.ConsumableRepository;
import com.jlmedaios.monolith.material_management.repository.ConsumableUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 耗材管理 Service。
 *
 * <p>append-only: 耗材使用记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class MaterialManagementService {

    private final ConsumableRepository consumableRepository;
    private final ConsumableUsageRepository consumableUsageRepository;

    /**
     * 耗材目录列表。
     *
     * @return 耗材列表
     */
    public List<Consumable> materialList() {
        return consumableRepository.findAll();
    }

    /**
     * 记录耗材使用。
     *
     * @param materialCode         耗材编码
     * @param quantityUsed         使用数量
     * @param department           使用科室
     * @param usedBy               使用人
     * @param relatedEncounterId    关联就诊 ID
     * @return 已持久化的使用记录
     */
    public ConsumableUsage recordUsage(String materialCode, int quantityUsed, String department,
                                       String usedBy, Long relatedEncounterId) {
        ConsumableUsage usage = ConsumableUsage.builder()
                .usageNo("USR-" + System.currentTimeMillis())
                .materialCode(materialCode)
                .quantityUsed(quantityUsed)
                .department(department)
                .usedBy(usedBy)
                .relatedEncounterId(relatedEncounterId)
                .build();
        return consumableUsageRepository.save(usage);
    }

    /**
     * 低库存预警。
     *
     * @return 低库存耗材列表
     */
    public List<Consumable> lowStock() {
        // P8 性能优化：直接调用 Repository 派生查询
        return consumableRepository.findByStockQuantityLessThan(50);
    }

    /**
     * 耗材使用统计（按科室，mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> usageStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("byDepartment", List.of(
                Map.of("dept", "手术室", "total_used", 120),
                Map.of("dept", "ICU", "total_used", 85)
        ));
        return stats;
    }
}
