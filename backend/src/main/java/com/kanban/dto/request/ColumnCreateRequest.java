package com.kanban.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColumnCreateRequest {

    @NotBlank(message = "O título da coluna é obrigatório")
    @Size(max = 100, message = "O título da coluna deve ter no máximo 100 caracteres")
    private String title;
}
