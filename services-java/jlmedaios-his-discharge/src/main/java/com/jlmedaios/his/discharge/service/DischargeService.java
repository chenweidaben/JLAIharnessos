/*
 * 健澜科技 jlmedaios - 出院结算 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.discharge.service;

import com.jlmedaios.his.discharge.entity.DischargeOrder;
import com.jlmedaios.his.discharge.repository.DischargeOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 出院结算 Service。
 */
@Service
@RequiredArgsConstructor
public class DischargeService {

    private final DischargeOrderRepository dischargeOrderRepository;

    /**
     * 出院申请。
     *
     * @param visitId 就诊 ID
     * @return 已持久化的出院医嘱
     */
    public DischargeOrder apply(Long visitId) {
        DischargeOrder order = DischargeOrder.builder()
                .visitId(visitId)
                .build();
        return dischargeOrderRepository.save(order);
    }

    /**
     * 出院结算（mock totalAmount 随机 1000-5000，status → SETTLED）。
     *
     * @param visitId 就诊 ID
     * @return 更新后的出院医嘱
     */
    public Optional<DischargeOrder> settle(Long visitId) {
        Optional<DischargeOrder> opt = dischargeOrderRepository.findByVisitId(visitId);
        opt.ifPresent(o -> {
            int amount = ThreadLocalRandom.current().nextInt(1000, 5001);
            o.setStatus("SETTLED");
            o.setTotalAmount(BigDecimal.valueOf(amount));
            dischargeOrderRepository.save(o);
        });
        return opt;
    }

    /**
     * 出院小结（mock summary 文本）。
     *
     * @param visitId 就诊 ID
     * @return 更新后的出院医嘱
     */
    public Optional<DischargeOrder> summary(Long visitId) {
        Optional<DischargeOrder> opt = dischargeOrderRepository.findByVisitId(visitId);
        opt.ifPresent(o -> {
            o.setSummary("患者住院期间病情平稳，治疗效果良好，符合出院标准。建议出院后定期复诊。");
            dischargeOrderRepository.save(o);
        });
        return opt;
    }
}
