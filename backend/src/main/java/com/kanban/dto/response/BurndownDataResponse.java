package com.kanban.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BurndownDataResponse {
    private Long boardId;
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer durationDays;
    private Integer totalStoryPoints;
    private Integer remainingStoryPoints;
    private Map<String, Integer> completedPerDay; // "YYYY-MM-DD" -> storyPoints completed that day
}
