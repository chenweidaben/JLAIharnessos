/*
 * 健澜科技 jlmedaios - 处方配送 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.prescription_delivery.service;

import com.jlmedaios.monolith.prescription_delivery.entity.PrescriptionDelivery;
import com.jlmedaios.monolith.prescription_delivery.repository.PrescriptionDeliveryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 处方配送 Service。
 *
 * <p>append-only: 处方配送记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class PrescriptionDeliveryService {

    private final PrescriptionDeliveryRepository prescriptionDeliveryRepository;

    /**
     * 创建配送。
     *
     * @param prescriptionNo   处方编号
     * @param patientId        患者 ID
     * @param drugListJSON     药品列表 JSON
     * @param recipientName    收件人姓名
     * @param recipientPhone   收件人电话
     * @param address          配送地址
     * @param deliveryFee      配送费
     * @return 已持久化的配送
     */
    public PrescriptionDelivery create(String prescriptionNo, Long patientId,
                                        String drugListJSON, String recipientName,
                                        String recipientPhone, String address,
                                        BigDecimal deliveryFee) {
        PrescriptionDelivery delivery = PrescriptionDelivery.builder()
                .prescriptionNo(prescriptionNo)
                .patientId(patientId)
                .drugListJSON(drugListJSON)
                .recipientName(recipientName)
                .recipientPhone(recipientPhone)
                .address(address)
                .deliveryFee(deliveryFee)
                .build();
        return prescriptionDeliveryRepository.save(delivery);
    }

    /**
     * 配药完成发货（设 status=SHIPPED）。
     *
     * @param id         配送 ID
     * @param trackingNo 物流单号
     * @return 已更新的配送
     */
    public Optional<PrescriptionDelivery> dispatch(Long id, String trackingNo) {
        Optional<PrescriptionDelivery> opt = prescriptionDeliveryRepository.findById(id);
        if (opt.isPresent()) {
            PrescriptionDelivery delivery = opt.get();
            delivery.setStatus("SHIPPED");
            delivery.setTrackingNo(trackingNo);
            delivery.setUpdatedAt(LocalDateTime.now());
            prescriptionDeliveryRepository.save(delivery);
        }
        return opt;
    }

    /**
     * 签收（设 status=SIGNED）。
     *
     * @param id 配送 ID
     * @return 已更新的配送
     */
    public Optional<PrescriptionDelivery> sign(Long id) {
        Optional<PrescriptionDelivery> opt = prescriptionDeliveryRepository.findById(id);
        if (opt.isPresent()) {
            PrescriptionDelivery delivery = opt.get();
            delivery.setStatus("SIGNED");
            delivery.setUpdatedAt(LocalDateTime.now());
            prescriptionDeliveryRepository.save(delivery);
        }
        return opt;
    }

    /**
     * 待配药列表（status=PENDING）。
     *
     * @return 配送列表
     */
    public List<PrescriptionDelivery> pendingList() {
        return prescriptionDeliveryRepository.findByStatus("PENDING");
    }
}
