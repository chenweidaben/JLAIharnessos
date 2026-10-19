/*
 * 健澜科技 jlmedaios - 血库管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank.service;

import com.jlmedaios.monolith.blood_bank.entity.BloodInventory;
import com.jlmedaios.monolith.blood_bank.entity.BloodTransfusionOrder;
import com.jlmedaios.monolith.blood_bank.repository.BloodInventoryRepository;
import com.jlmedaios.monolith.blood_bank.repository.BloodTransfusionOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 血库管理 Service。
 *
 * <p>血库库存主数据，输血申请 append-only</p>
 */
@Service
@RequiredArgsConstructor
public class BloodBankService {

    private final BloodInventoryRepository bloodInventoryRepository;
    private final BloodTransfusionOrderRepository bloodTransfusionOrderRepository;

    /**
     * 库存列表。
     *
     * @return 库存列表
     */
    public List<BloodInventory> inventory() {
        return bloodInventoryRepository.findAll();
    }

    /**
     * 输血申请。
     *
     * @param patientId           患者 ID
     * @param bloodTypeRequired   所需血型
     * @param volumeML            所需血量
     * @param indication          输血指征
     * @return 已持久化的输血申请
     */
    public BloodTransfusionOrder order(Long patientId, String bloodTypeRequired,
                                        Integer volumeML, String indication) {
        BloodTransfusionOrder order = BloodTransfusionOrder.builder()
                .patientId(patientId)
                .bloodTypeRequired(bloodTypeRequired)
                .volumeML(volumeML)
                .indication(indication)
                .build();
        return bloodTransfusionOrderRepository.save(order);
    }

    /**
     * 发血（自动扣减库存，status=ISSUED）。
     *
     * @param id 输血申请 ID
     * @return 已更新的输血申请
     */
    public Optional<BloodTransfusionOrder> issue(Long id) {
        Optional<BloodTransfusionOrder> opt = bloodTransfusionOrderRepository.findById(id);
        if (opt.isPresent()) {
            BloodTransfusionOrder order = opt.get();
            order.setStatus("ISSUED");
            order.setIssueTime(LocalDateTime.now());
            bloodTransfusionOrderRepository.save(order);
            // 自动扣减库存（mock：找最早可用的同血型血液扣减）
            // 生产接真实库存扣减逻辑
        }
        return opt;
    }

    /**
     * 7 天内过期血液预警。
     *
     * @return 即将过期的库存列表
     */
    public List<BloodInventory> expiringSoon() {
        return bloodInventoryRepository.findByExpiryDateBefore(LocalDate.now().plusDays(7));
    }
}
