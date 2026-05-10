package com.kanban.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CardMoveRequest {

    @NotNull(message = "O ID da coluna destino é obrigatório")
    private Long targetColumnId;

    private Integer position;
}
