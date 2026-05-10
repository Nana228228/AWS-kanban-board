package com.kanban.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CardCreateRequest {

    @NotBlank(message = "O título do cartão é obrigatório")
    @Size(max = 200, message = "O título do cartão deve ter no máximo 200 caracteres")
    private String title;

    @Size(max = 2000, message = "A descrição do cartão deve ter no máximo 2000 caracteres")
    private String description;

    @Min(value = 0, message = "Os story points devem ser maior ou igual a 0")
    private Integer storyPoints;
}
