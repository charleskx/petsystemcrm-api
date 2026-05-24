## ADDED Requirements

### Requirement: Autocomplete de endereço via Google Maps
O sistema SHALL fornecer sugestões de endereço a partir de uma query de texto, utilizando a Google Maps Places API como backend, sem expor a chave de API ao cliente.

#### Scenario: Busca com resultado
- **WHEN** `GET /clients/address/autocomplete?q=Rua das Flores` é chamado por usuário autenticado
- **THEN** o sistema retorna `200` com array `suggestions`, cada item contendo `description` (endereço formatado) e `placeId`

#### Scenario: Query muito curta
- **WHEN** `GET /clients/address/autocomplete?q=R` é chamado (menos de 3 caracteres)
- **THEN** o sistema retorna `422` sem chamar a API do Google Maps

#### Scenario: Parâmetro `q` ausente
- **WHEN** `GET /clients/address/autocomplete` é chamado sem o parâmetro `q`
- **THEN** o sistema retorna `422`

#### Scenario: Google Maps API indisponível ou chave ausente
- **WHEN** a variável `GOOGLE_MAPS_API_KEY` não está configurada ou a API retorna erro
- **THEN** o sistema retorna `503` com mensagem indicando que o serviço de autocomplete está indisponível

#### Scenario: Sem autenticação
- **WHEN** `GET /clients/address/autocomplete` é chamado sem sessão válida
- **THEN** o sistema retorna `401`
