# Gemini no aplicativo CifraWealth (Android)

## Objetivo

Permitir que o usuário peça ao Gemini para abrir diretamente a tela nativa de lançamento por voz do CifraWealth. A partir daí, a captura de fala, a interpretação, a revisão e o salvamento continuam dentro do próprio aplicativo.

Esta integração é Android nativa (Jetpack AppFunctions). Não cria uma tela web nem um servidor MCP remoto.

## Fluxo

1. O usuário pede ao Gemini para iniciar um lançamento no CifraWealth.
2. O Gemini chama `openVoiceTransactionEntry`.
3. O AppFunction retorna um `PendingIntent` imutável para `cifrawealth://assistente-voz`.
4. O Android abre o CifraWealth e a navegação leva o usuário diretamente ao modal de reconhecimento de voz.
5. O usuário fala diretamente com o app. O parser local prepara o rascunho.
6. O usuário revisa descrição, valor, tipo e categoria e toca em Salvar movimentação.

## Privacidade

O AppFunction não recebe nem retorna valores financeiros, descrições, categorias, saldo ou histórico. Ele apenas retorna um `PendingIntent` para a tela do app, conforme as diretrizes de AppFunctions para dados financeiros sensíveis.

O reconhecimento de voz existente continua sendo executado pelo fluxo nativo do aparelho; a gravação não é enviada ao backend pelo CifraWealth. A criação da transação usa a API autenticada já existente depois que o usuário confirma no aplicativo.

## Compatibilidade

- AppFunctions requer Android 16 (API 36) ou superior no aparelho.
- O build precisa de compileSdk 37 e Android Gradle Plugin 9.1.0 ou superior; o projeto usa Expo SDK 58.
- Gemini só descobre as funções depois que o Connected App Android MCP é cadastrado e publicado/ativado para os testadores no Google Connected Console.
- Em Android anterior ao 16, o botão de lançamento por voz já existente dentro de Transações continua disponível; apenas a invocação por Gemini não fica disponível.

## Verificação local

Depois de gerar e instalar um build Android no aparelho compatível:

```bash
adb shell cmd app_function list-app-functions --package com.cifrawealth.app
```

A função registrada deverá aparecer como `CifraWealthAppFunctionService#openVoiceTransactionEntry`.

Para testar a navegação sem Gemini:

```bash
adb shell am start -a android.intent.action.VIEW -d "cifrawealth://assistente-voz" com.cifrawealth.app
```

## Publicação e testes com Gemini

1. Solicite acesso à prévia Connected Apps Platform.
2. Cadastre um Connected App do tipo Android MCP no Google Connected Console e vincule o aplicativo publicado no Google Play.
3. Envie um Android App Bundle que contenha o serviço AppFunctions.
4. Adicione os testadores no Connected Console e na faixa de teste do Google Play.
5. Valide a descoberta da função e a abertura da tela de voz no Gemini para Android.

## Fora do escopo desta etapa

- Criar ou salvar uma movimentação diretamente a partir de parâmetros financeiros enviados pelo Gemini.
- A integração equivalente para Siri/iOS. Isso exigirá App Intents em uma etapa posterior.
