/*
 * 健澜科技 jlmedaios - 物资耗材 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material.service;

import com.jlmedaios.monolith.material.entity.MaterialItem;
import com.jlmedaios.monolith.material.entity.MaterialUsage;
import com.jlmedaios.monolith.material.repository.MaterialItemRepository;
import com.jlmedaios.monolith.material.repository.MaterialUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 物资耗材 Service。
 *
 * <p>物资耗材主数据，库存可增减</p>
 */
@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialItemRepository materialItemRepository;
    private final MaterialUsageRepository materialUsageRepository;

    /**
     * 库存列表。
     *
     * @return 物资列表
     */
    public List<MaterialItem> listItems() {
        return materialItemRepository.findAll();
    }

    /**
     * 记录耗材消耗（自动扣减库存）。
     *
     * @param patientId   患者 ID
     * @param encounterId 就诊 ID
     * @param materialCode 物资编码
     * @param quantity    数量
     * @param deptCode    科室编码
     * @return 已持久化的消耗记录
     */
    public MaterialUsage recordUsage(Long patientId, Long encounterId, String materialCode,
                                     Integer quantity, String deptCode) {
        // 自动扣减库存
        Optional<MaterialItem> itemOpt = materialItemRepository.findByMaterialCode(materialCode);
        if (itemOpt.isPresent()) {
            MaterialItem item = itemOpt.get();
            item.setStockQuantity(item.getStockQuantity() - quantity);
            materialItemRepository.save(item);
        }

        MaterialUsage usage = MaterialUsage.builder()
                .patientId(patientId)
                .encounterId(encounterId)
                .materialCode(materialCode)
                .quantity(quantity)
                .deptCode(deptCode)
                .build();
        return materialUsageRepository.save(usage);
    }

    /**
     * 低库存预警列表。
     *
     * @return 低库存物资列表
     */
    public List<MaterialItem> lowStock() {
        return materialItemRepository.findAll().stream()
                .filter(item -> item.getStockQuantity() < item.getSafetyStock())
                .toList();
    }
}
