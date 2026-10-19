/*
 * 健澜科技 jlmedaios - 电子病历 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emr.service;

import com.jlmedaios.monolith.emr.entity.EmrDocument;
import com.jlmedaios.monolith.emr.repository.EmrDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 电子病历 Service。
 */
@Service
@RequiredArgsConstructor
public class EmrService {

    private final EmrDocumentRepository emrDocumentRepository;

    /**
     * 创建病历（append-only）。
     * 计算 appendHash = SHA-256(patientId + docType + contentText + prevHash)（mock 固定 hash）。
     *
     * @param patientId     患者 ID
     * @param visitType     就诊类型
     * @param deptCode      科室编码
     * @param doctorId      医生 ID
     * @param mainDiagnosis 主诊断
     * @param docType       病历类型
     * @param contentText   病历内容
     * @param prevHash      前一记录哈希
     * @return 已持久化的病历
     */
    public EmrDocument create(Long patientId, String visitType, String deptCode, String doctorId,
                              String mainDiagnosis, String docType, String contentText, String prevHash) {
        // mock SHA-256 哈希
        String appendHash = "hash_" + Math.abs((patientId + docType + contentText + prevHash).hashCode());

        EmrDocument doc = EmrDocument.builder()
                .patientId(patientId)
                .visitType(visitType)
                .deptCode(deptCode)
                .doctorId(doctorId)
                .mainDiagnosis(mainDiagnosis)
                .docType(docType)
                .contentText(contentText)
                .appendHash(appendHash)
                .prevHash(prevHash)
                .build();
        return emrDocumentRepository.save(doc);
    }

    /**
     * CA 签名（signStatus → SIGNED）。
     *
     * @param id      病历 ID
     * @param signBy  签名人
     * @return 更新后的病历
     */
    public Optional<EmrDocument> sign(Long id, String signBy) {
        Optional<EmrDocument> opt = emrDocumentRepository.findById(id);
        opt.ifPresent(doc -> {
            doc.setSignStatus("SIGNED");
            doc.setSignBy(signBy);
            emrDocumentRepository.save(doc);
        });
        return opt;
    }

    /**
     * 按患者 ID 查询病历列表。
     *
     * @param patientId 患者 ID
     * @return 病历列表
     */
    public List<EmrDocument> listByPatient(Long patientId) {
        return emrDocumentRepository.findByPatientId(patientId);
    }

    /**
     * 校验 hash 链（mock）。
     *
     * @param id 病历 ID
     * @return 校验结果 Map
     */
    public Map<String, Object> verify(Long id) {
        Optional<EmrDocument> opt = emrDocumentRepository.findById(id);
        Map<String, Object> result = new HashMap<>();
        if (opt.isPresent()) {
            EmrDocument doc = opt.get();
            result.put("valid", true);
            result.put("currentHash", doc.getAppendHash());
            result.put("prevHash", doc.getPrevHash());
        } else {
            result.put("valid", false);
            result.put("message", "病历不存在");
        }
        return result;
    }
}
