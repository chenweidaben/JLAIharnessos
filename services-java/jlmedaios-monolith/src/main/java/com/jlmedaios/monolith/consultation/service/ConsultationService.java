/*
 * 健澜科技 jlmedaios - 会诊管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consultation.service;

import com.jlmedaios.monolith.consultation.entity.Consultation;
import com.jlmedaios.monolith.consultation.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 会诊管理 Service。
 *
 * <p>append-only: 会诊记录不可修改，全过程留痕</p>
 */
@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;

    /**
     * 发起会诊申请。
     *
     * @param requestDept 申请科室
     * @param targetDept  目标科室
     * @param patientId   患者 ID
     * @param reason      会诊原因
     * @param requestDoctor 申请医生
     * @return 已持久化的会诊
     */
    public Consultation request(String requestDept, String targetDept, Long patientId,
                                String reason, String requestDoctor) {
        Consultation consultation = Consultation.builder()
                .requestDept(requestDept)
                .targetDept(targetDept)
                .patientId(patientId)
                .reason(reason)
                .requestDoctor(requestDoctor)
                .build();
        return consultationRepository.save(consultation);
    }

    /**
     * 接受会诊（设 status=ACCEPTED + consultTime）。
     *
     * @param id           会诊 ID
     * @param consultDoctor 会诊医生
     * @return 已更新的会诊
     */
    public Optional<Consultation> accept(Long id, String consultDoctor) {
        Optional<Consultation> opt = consultationRepository.findById(id);
        if (opt.isPresent()) {
            Consultation consultation = opt.get();
            consultation.setStatus("ACCEPTED");
            consultation.setConsultDoctor(consultDoctor);
            consultation.setConsultTime(LocalDateTime.now());
            consultation.setUpdatedAt(LocalDateTime.now());
            consultationRepository.save(consultation);
        }
        return opt;
    }

    /**
     * 完成会诊（设 status=COMPLETED）。
     *
     * @param id            会诊 ID
     * @param consultResult 会诊结果
     * @return 已更新的会诊
     */
    public Optional<Consultation> complete(Long id, String consultResult) {
        Optional<Consultation> opt = consultationRepository.findById(id);
        if (opt.isPresent()) {
            Consultation consultation = opt.get();
            consultation.setStatus("COMPLETED");
            consultation.setConsultResult(consultResult);
            consultation.setUpdatedAt(LocalDateTime.now());
            consultationRepository.save(consultation);
        }
        return opt;
    }

    /**
     * 待会诊列表（status=PENDING）。
     *
     * @return 会诊列表
     */
    public List<Consultation> pendingList() {
        return consultationRepository.findByStatus("PENDING");
    }
}
