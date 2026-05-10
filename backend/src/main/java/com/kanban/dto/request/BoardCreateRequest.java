package com.kanban.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardCreateRequest {

    @NotBlank(message = "O título do quadro é obrigatório")
    @Size(max = 100, message = "O título do quadro deve ter no máximo 100 caracteres")
    private String title;

    @NotNull(message = "A data de início é obrigatória")
    private LocalDate startDate;

    @NotNull(message = "A duração em dias é obrigatória")
    @Min(value = 1, message = "A duração deve ser de pelo menos 1 dia")
    private Integer durationDays;
}
