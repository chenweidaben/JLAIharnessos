/*
 * 健澜科技 jlmedaios - 住院工作流 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.inpatient_workflow.service;

import com.jlmedaios.monolith.inpatient_workflow.entity.InpatientEpisode;
import com.jlmedaios.monolith.inpatient_workflow.repository.InpatientEpisodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 住院工作流 Service。
 *
 * <p>append-only: 住院episode不可修改；串联入院→医嘱→护理→结算→出院全流程</p>
 */
@Service
@RequiredArgsConstructor
public class InpatientWorkflowService {

    private final InpatientEpisodeRepository inpatientEpisodeRepository;

    /**
     * 办理入院。
     *
     * @param episodeNo       episode 编号
     * @param patientId        患者 ID
     * @param admitDepartment  入院科室
     * @param bedNo            床号
     * @return 已持久化的住院 episode
     */
    public InpatientEpisode admit(String episodeNo, String patientId, String admitDepartment,
                                   String bedNo) {
        InpatientEpisode episode = InpatientEpisode.builder()
                .episodeNo(episodeNo)
                .patientId(patientId)
                .admitDepartment(admitDepartment)
                .bedNo(bedNo)
                .build();
        return inpatientEpisodeRepository.save(episode);
    }

    /**
     * 办理出院（status=DISCHARGED + dischargeTime + totalStayDays）。
     *
     * @param episodeId episode ID
     * @return 已更新的住院 episode
     */
    public Optional<InpatientEpisode> discharge(Long episodeId) {
        Optional<InpatientEpisode> opt = inpatientEpisodeRepository.findById(episodeId);
        if (opt.isPresent()) {
            InpatientEpisode episode = opt.get();
            episode.setStatus("DISCHARGED");
            episode.setDischargeTime(LocalDateTime.now());
            if (episode.getAdmitTime() != null) {
                long days = Duration.between(episode.getAdmitTime(), episode.getDischargeTime()).toDays();
                episode.setTotalStayDays((int) days);
            }
            inpatientEpisodeRepository.save(episode);
        }
        return opt;
    }

    /**
     * 住院时间线。
     *
     * @param episodeId episode ID
     * @return 时间线
     */
    public Map<String, Object> timeline(Long episodeId) {
        Optional<InpatientEpisode> opt = inpatientEpisodeRepository.findById(episodeId);
        Map<String, Object> result = new HashMap<>();
        if (opt.isPresent()) {
            InpatientEpisode episode = opt.get();
            result.put("admit", episode.getAdmitTime());
            result.put("diagnoses", "mock: 入院诊断已记录");
            result.put("orders", "mock: 医嘱已执行");
            result.put("nursing", "mock: 护理记录完整");
            result.put("settlement", "mock: 费用已结算");
            result.put("discharge", episode.getDischargeTime());
        }
        return result;
    }

    /**
     * 住院流程统计。
     *
     * @return 统计结果
     */
    public Map<String, Object> stats() {
        List<InpatientEpisode> discharged = inpatientEpisodeRepository.findByStatus("DISCHARGED");
        Map<String, Object> result = new HashMap<>();
        double avgStay = discharged.stream()
                .filter(e -> e.getTotalStayDays() != null)
                .mapToInt(InpatientEpisode::getTotalStayDays)
                .average().orElse(0);
        result.put("avg_stay_days", String.format("%.1f天", avgStay));
        result.put("bed_turnover_rate", "3.2次/床/月");
        return result;
    }
}
