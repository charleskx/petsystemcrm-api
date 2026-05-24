## ADDED Requirements

### Requirement: Upload de foto do pet
O sistema SHALL permitir o upload de uma foto para um pet, armazenando-a no Cloudflare R2 e persistindo a URL pública em `pet.photo_url`. Uma foto anterior deve ser removida do storage ao ser substituída.

#### Scenario: Upload bem-sucedido
- **WHEN** `POST /pets/:id/photo` é chamado com arquivo `image/jpeg`, `image/png` ou `image/webp` de no máximo 5 MB, para pet do tenant autenticado
- **THEN** o sistema armazena a imagem no R2 com chave `pets/{petId}/photo.{ext}`, atualiza `pet.photo_url` e retorna `200` com `{ photoUrl: "<url>" }`

#### Scenario: Substituição de foto existente
- **WHEN** `POST /pets/:id/photo` é chamado para pet que já possui `photo_url`
- **THEN** o sistema remove a foto anterior do R2 antes de fazer o novo upload

#### Scenario: Formato de arquivo inválido
- **WHEN** `POST /pets/:id/photo` é chamado com arquivo de tipo diferente de `image/jpeg`, `image/png` ou `image/webp`
- **THEN** o sistema retorna `422` com mensagem indicando os formatos aceitos

#### Scenario: Arquivo acima do limite de tamanho
- **WHEN** `POST /pets/:id/photo` é chamado com arquivo maior que 5 MB
- **THEN** o sistema retorna `422` com mensagem indicando o tamanho máximo permitido

#### Scenario: Pet de outro tenant
- **WHEN** `POST /pets/:id/photo` é chamado para pet de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `POST /pets/:id/photo` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`
