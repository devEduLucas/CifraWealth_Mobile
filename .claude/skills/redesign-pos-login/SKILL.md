---
name: redesign-pos-login
description: Redesenha e implementa telas pós-login de aplicações web e mobile, mantendo a identidade visual existente, usando exclusivamente dados reais da API para conteúdo dinâmico e preservando autenticação, navegação, funcionalidades e temas claro e escuro. Use quando o usuário solicitar melhorias visuais ou uma reformulação das telas autenticadas.
---

# Skill: Redesign profissional das telas pós-login

## Objetivo

Atue como um desenvolvedor frontend sênior e designer de produto UI/UX. Analise o projeto existente e implemente um redesign completo, consistente e profissional das telas acessadas após o login.

O resultado deve parecer parte do mesmo produto que as telas de autenticação, mas apresentar um nível superior de acabamento visual, hierarquia, organização e usabilidade.

Não entregue apenas sugestões, exemplos ou protótipos isolados. Implemente as alterações diretamente no código existente.

## 1. Analise o projeto antes de modificar o código

Antes de implementar qualquer alteração:

1. Identifique a stack, a estrutura de diretórios e os padrões arquiteturais utilizados.
2. Examine as telas de login, cadastro e recuperação de senha para compreender a identidade visual do produto.
3. Identifique todas as telas acessíveis após a autenticação e os componentes compartilhados utilizados por elas.
4. Examine o sistema de temas, incluindo as cores, tipografia, tokens, variáveis e estilos globais.
5. Analise a navegação, as rotas protegidas, os layouts e a organização das páginas.
6. Localize os serviços de API, hooks, contextos, stores, tipos, modelos e interfaces que fornecem os dados do usuário autenticado.
7. Identifique os estados de carregamento, vazio e erro já existentes.
8. Consulte os arquivos de configuração e os padrões de implementação do projeto.

Utilize as ferramentas disponíveis para inspecionar os arquivos relevantes antes de decidir como implementar o redesign.

Não presuma nomes de arquivos, bibliotecas, rotas, componentes ou endpoints. Descubra como o projeto realmente funciona.

## 2. Preserve integralmente as regras de negócio

O trabalho é uma melhoria de apresentação e experiência do usuário, não uma reescrita da aplicação.

Regras obrigatórias:

- Não altere o fluxo de login, logout, cadastro, recuperação de senha ou renovação de sessão.
- Não modifique contratos, endpoints, payloads ou respostas do backend.
- Não altere regras de negócio, permissões ou mecanismos de autorização.
- Não remova funcionalidades existentes das telas.
- Não substitua a API real por dados simulados.
- Não crie uma segunda implementação de autenticação.
- Não introduza bibliotecas desnecessárias quando os recursos existentes forem suficientes.
- Não reescreva arquivos inteiros sem necessidade.
- Preserve a arquitetura, as convenções de nomenclatura e os padrões de código já adotados.
- Não exponha tokens, credenciais, dados pessoais ou informações sensíveis em logs.

Se uma funcionalidade estiver quebrada antes da implementação, identifique o problema e evite atribuir ao redesign mudanças de comportamento não autorizadas.

## 3. Utilize exclusivamente dados reais

Todo conteúdo dinâmico deve ser obtido das fontes reais já existentes no projeto.

Isso inclui, conforme as funcionalidades disponíveis:

- Nome e informações do usuário autenticado.
- Foto ou avatar, quando disponibilizados pela API.
- Transações e movimentações financeiras.
- Saldo e indicadores financeiros.
- Categorias, metas, orçamentos e relatórios.
- Histórico e gráficos.
- Datas, notificações e outras informações personalizadas.

Não invente conteúdo para preencher espaços visuais.

É proibido utilizar nomes fictícios, saldos inventados, transações de demonstração, metas falsas, percentuais arbitrários ou dados estáticos que aparentem pertencer ao usuário.

Também não utilize valores fixos disfarçados de dados reais.

### Regras para integração com a API

1. Reutilize os serviços, hooks, contextos, stores e tipos existentes.
2. Identifique de onde cada informação é obtida e como ela é associada ao usuário autenticado.
3. Preserve os mecanismos de autenticação das requisições.
4. Evite requisições duplicadas e chamadas desnecessárias.
5. Respeite os tipos, contratos e formatos de resposta existentes.
6. Utilize formatação apropriada para moeda, datas e números, respeitando as convenções já adotadas pelo aplicativo.
7. Diferencie corretamente ausência de dados, carregamento, erro e valores legítimos iguais a zero.
8. Nunca transforme um erro da API em uma lista vazia ou saldo zero sem informar o estado real.
9. Não exponha informações de outro usuário nem contorne verificações de autorização.
10. Se um endpoint ou campo necessário não existir, não invente uma integração. Preserve o contrato do backend e informe a limitação encontrada.

Quando não houver informações suficientes para preencher um componente, apresente um estado vazio elegante e contextualizado, com uma ação útil quando existir uma operação compatível no aplicativo.

## 4. Preserve a identidade visual

A identidade visual atual é a referência obrigatória.

Analise as telas de autenticação e reutilize, sempre que apropriado:

- Paleta de cores.
- Tipografia e hierarquia textual.
- Bordas, raios e sombras.
- Espaçamentos e alinhamentos.
- Estilo dos botões e campos.
- Ícones e ilustrações existentes.
- Padrões de cartões e componentes.
- Transições e microinterações.
- Linguagem visual dos estados de interação.

Não crie uma nova identidade visual, não troque arbitrariamente a paleta e não introduza cores que entrem em conflito com o tema atual.

O objetivo é evoluir o design existente, não fazer com que o aplicativo pareça outro produto.

## 5. Desenvolva um design moderno e bem acabado

Aplique princípios de design de produto e interfaces contemporâneas.

Priorize:

- Hierarquia visual clara e leitura rápida.
- Organização das informações por importância.
- Espaçamento consistente e boa densidade de conteúdo.
- Composição visual equilibrada.
- Componentes reutilizáveis.
- Tipografia legível.
- Ícones coerentes com o sistema existente.
- Gráficos apenas quando houver dados reais suficientes.
- Feedback visual para ações e interações.
- Microinterações discretas, sem comprometer o desempenho.
- Responsividade para diferentes tamanhos de tela.
- Acessibilidade, contraste e estados de foco.
- Prevenção de deslocamentos desnecessários do layout durante o carregamento.

Evite excesso de cartões, gradientes decorativos, sombras exageradas, elementos sem função, animações excessivas e aparência genérica de template.

Não adicione elementos visuais apenas para ocupar espaço.

### Primeira tela após o login

Dê atenção especial à tela inicial autenticada.

Ela deve permitir que o usuário compreenda rapidamente sua situação atual e encontre as principais funcionalidades do aplicativo.

Organize o conteúdo de acordo com a finalidade real do produto e com os dados que efetivamente existem na API.

Não force uma estrutura de dashboard financeiro caso o projeto não seja uma aplicação financeira.

A primeira tela deve apresentar uma experiência coerente com o restante do produto, com conteúdo personalizado, ações relevantes e boa hierarquia.

## 6. Implemente corretamente os temas claro e escuro

O projeto já possui suporte aos temas claro e escuro. Preserve esse mecanismo.

- Reutilize os tokens, variáveis e funções de tema existentes.
- Garanta que textos, superfícies, bordas, ícones e estados interativos funcionem nos dois temas.
- Verifique contraste e legibilidade.
- Evite cores fixas que funcionem somente em um tema.
- Evite duplicar a lógica de gerenciamento do tema.
- Preserve a preferência do usuário e o comportamento atual da aplicação.
- Verifique estados de hover, foco, seleção, carregamento, erro e vazio nos dois temas.

Não remova nem simplifique a alternância de temas para facilitar a implementação.

## 7. Trate todos os estados da interface

Cada tela ou componente que depende de dados assíncronos deve tratar adequadamente os estados aplicáveis.

### Carregamento

Utilize skeletons, indicadores ou outros padrões coerentes com o design existente. Evite deixar áreas inteiras vazias sem explicação ou exibir dados fictícios enquanto a API responde.

### Estado vazio

Explique de forma breve o que está ausente e, quando apropriado, disponibilize uma ação real para criar, consultar ou configurar o conteúdo.

Não mostre dados de demonstração para simular uma tela preenchida.

### Erro

Apresente uma mensagem compreensível e, quando houver suporte na aplicação, uma ação para tentar novamente.

Não esconda falhas da API nem mostre informações técnicas desnecessárias ao usuário.

### Sucesso e interação

Preserve os feedbacks existentes e mantenha as ações conectadas às funcionalidades reais.

Não apresente uma operação como concluída antes de sua confirmação.

## 8. Preserve a navegação e a experiência responsiva

Mantenha a navegação e os comportamentos já existentes.

Verifique:

- Links, botões e menus.
- Rotas protegidas.
- Redirecionamentos após autenticação.
- Navegação entre as telas.
- Ações de criação, edição, consulta e exclusão existentes.
- Modais, formulários e filtros.
- Comportamento em dispositivos móveis, tablets e desktops.
- Estados de foco e navegação por teclado.

Não crie botões decorativos que aparentem funcionar, mas não executem nenhuma ação.

Não remova funcionalidades para simplificar o layout.

## 9. Execute a implementação diretamente

Depois da análise, implemente o redesign nos arquivos existentes.

Trabalhe de forma incremental:

1. Identifique as telas e componentes prioritários.
2. Defina uma direção visual baseada no design atual.
3. Reaproveite os componentes e tokens existentes.
4. Refatore somente o necessário.
5. Implemente as telas e seus estados.
6. Conecte os componentes aos dados reais.
7. Ajuste responsividade e acessibilidade.
8. Execute as verificações técnicas disponíveis.

Não pare após apresentar um plano. Use o plano como orientação e continue até implementar o trabalho solicitado, respeitando as limitações reais do ambiente.

Se encontrar ambiguidades que não impeçam a execução, adote a solução mais consistente com o projeto. Se uma decisão exigir alteração do contrato da API, mudança de segurança ou quebra de comportamento, não a faça silenciosamente.

## 10. Verifique o resultado

Ao terminar, execute as verificações compatíveis com o projeto:

- Lint.
- Verificação de tipos.
- Build de produção.
- Testes automatizados existentes.
- Verificações de navegação e integração que possam ser realizadas no ambiente disponível.

Corrija os problemas introduzidos pelas alterações.

Não afirme que testes passaram se não foram executados. Diferencie problemas preexistentes dos problemas causados pelas mudanças.

Se houver ferramentas de navegador disponíveis, examine as telas em execução nos temas claro e escuro e em diferentes tamanhos de tela. Não declare que a interface foi validada visualmente se isso não ocorreu.

## 11. Formato da entrega final

Ao concluir, apresente um relatório objetivo contendo:

### Resumo
Descreva o que mudou e como a experiência melhorou.

### Arquivos modificados
Liste os arquivos criados, alterados ou removidos, com uma explicação breve da responsabilidade de cada um.

### Decisões de design
Explique a hierarquia visual, os componentes reutilizados, os ajustes de responsividade e as decisões relacionadas aos temas.

### Dados reais
Para cada tela pós-login, explique de quais serviços, hooks, contextos ou endpoints vêm os dados utilizados. Diferencie os dados efetivamente integrados das áreas que ainda dependem de alguma implementação existente.

### Estados da interface
Informe como foram tratados carregamento, ausência de dados e erros.

### Validação técnica
Liste os comandos executados e seus resultados. Informe explicitamente as verificações que não puderam ser realizadas.

### Limitações
Registre qualquer funcionalidade pendente ou dependência que tenha impedido a conclusão integral do trabalho.

## Critério final de qualidade

Considere o trabalho concluído somente quando as telas pós-login apresentarem um design coerente com a identidade existente, utilizarem dados reais, preservarem as funcionalidades e funcionarem corretamente nos temas claro e escuro, dentro das possibilidades de validação disponíveis.

Priorize qualidade visual, consistência técnica, integridade dos dados e manutenção do comportamento existente acima da quantidade de alterações realizadas.
