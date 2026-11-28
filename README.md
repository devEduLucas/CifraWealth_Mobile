# CifraWealth Mobile 📱

Aplicativo mobile de gestão financeira pessoal e controle patrimonial desenvolvido em **React Native + Expo**, compartilhando 100% da regra de negócio, contratos de API e identidade visual com o **CifraWealth Web**.

---

## 🎨 Consistência de Design & Tokens (Figma -> Mobile)

| Token | Valor Hex | Uso no App |
|---|---|---|
| `background` | `#0A0F1D` | Fundo principal da tela (Dark Canvas) |
| `surface` | `#111827` | Cartões e painéis principais |
| `surfaceElevated` | `#1F2937` | Inputs, abas ativas, botões secundários |
| `border` | `#374151` | Bordas e divisores |
| `primary` / `positive` | `#10B981` | Acento esmeralda, receitas, saldos positivos |
| `negative` | `#EF4444` | Despesas, alertas e saídas |
| `warning` | `#F59E0B` | Metas financeiras e avisos |
| `text` | `#F9FAFB` | Tipografia primária |
| `textMuted` | `#9CA3AF` | Subtítulos e rótulos secundários |

---

## 🚀 Como Executar o App Mobile

### 1. Pré-requisitos
* Node.js 18+ instalado
* Expo CLI (`npm install -g expo-cli`)
* Aplicativo **Expo Go** instalado no celular físico (iOS ou Android) OU emulador Android Studio / Simulador Xcode

### 2. Instalação das Dependências
Na pasta `cifra_mobile`:
```bash
cd cifra_mobile
npm install
```

### 3. Configurar a Conexão com o Backend
O app conecta-se diretamente ao backend do CifraWealth via `src/services/config.ts`.

* **Emulador Android**: Usa `http://10.0.2.2:3333` por padrão (mapeia o localhost da máquina).
* **Simulador iOS**: Usa `http://localhost:3333`.
* **Dispositivo Físico**: Altere em `src/services/config.ts` ou crie um arquivo `.env` com seu IP local na rede Wi-Fi:
  ```env
  EXPO_PUBLIC_API_URL=http://192.168.1.X:3333
  ```

### 4. Iniciar o App
```bash
npx expo start
```
Escaneie o QR Code com o aplicativo Expo Go ou pressione `a` para Android / `i` para iOS.

---

## 📁 Estrutura de Pastas Profissional

```
cifra_mobile/
├── App.tsx                     # Ponto de entrada com Providers
├── app.json                    # Configuração Expo / Branding
├── package.json
└── src/
    ├── components/             # Componentes modulares reutilizáveis
    │   └── common/             # Button, Card, Input, Header, Badge
    ├── hooks/
    │   └── useAuth.ts          # Gerenciamento de sessão e token
    ├── navigation/
    │   ├── AppNavigator.tsx
    │   ├── AuthNavigator.tsx   # Login, Cadastro, Recuperar Senha
    │   ├── TabNavigator.tsx    # Abas principais (Home, Transações, etc)
    │   └── RootNavigator.tsx   # Controle de rota protegida / pública
    ├── screens/
    │   ├── Auth/
    │   ├── Dashboard/          # Saldo, receitas, despesas, atalhos
    │   ├── Transactions/       # Listagem com filtro e nova transação
    │   ├── Categories/         # Categorias com paleta de cores
    │   ├── Goals/              # Metas com progresso e aportes
    │   ├── Reports/            # Relatórios mensais e acumulados
    │   └── Profile/            # Perfil do usuário e status do servidor
    ├── services/
    │   ├── api.ts              # Cliente HTTP sem mock (100% backend)
    │   ├── config.ts           # URL da API
    │   └── storage.ts          # Persistência de token no SecureStore
    ├── theme/                  # Paleta, espaçamentos e tipografia
    └── types/                  # Tipos TypeScript alinhados ao Prisma
```

---

## 🔒 Endpoints Consumidos (Sem Mocks)

* `POST /auth/login`
* `POST /users/register`
* `POST /auth/forgot-password`
* `POST /auth/reset-password`
* `GET /dashboard`
* `GET /transactions`
* `POST /transactions`
* `DELETE /transactions/:id`
* `GET /categories`
* `POST /categories`
* `DELETE /categories/:id`
* `GET /goals`
* `POST /goals`
* `POST /goals/:id/contribute`
* `DELETE /goals/:id`
* `GET /reports/monthly?ano=...`
* `GET /users/profile`


## Lançamento rápido

A tela de Transações aceita links internos para abrir diretamente o formulário, com o tipo já selecionado:

```text
cifrawealth://nova-transacao?tipo=despesa
cifrawealth://nova-transacao?tipo=receita
```

O formulário abre com o teclado numérico no campo de valor e sugere a categoria mais recentemente utilizada para aquele tipo de movimentação. O envio usa o endpoint autenticado `POST /transactions` com o cabeçalho `Idempotency-Key`, para que uma nova tentativa após falha de rede não crie uma duplicata.

Esses links são a base para os atalhos do ícone, widgets e ações de voz. Os widgets com gravação real sem abrir o app e os comandos de assistente nativos ainda exigem integração nativa específica por plataforma; não são entregues apenas pelo deep link.

## Login com Google no Android

O login Android usa um redirect URI nativo derivado do Client ID Android: `com.googleusercontent.apps.<client-id>:/oauthredirect`. O esquema reverso correspondente precisa permanecer em `expo.scheme` no `app.json`, e o Client ID deve corresponder ao OAuth Client Android configurado para o package `com.cifrawealth.app`.

Depois de alterar o esquema ou os Client IDs, execute `npx expo prebuild --clean --platform android` e gere um APK novo pelo EAS. O backend deve aceitar o Client ID que assina o ID token em `GOOGLE_CLIENT_ID` (lista separada por vírgulas, incluindo Web e Android quando ambos são usados). Nunca inclua segredo OAuth no aplicativo.

## Widget Android — Lançamento rápido

O projeto inclui um widget Android nativo, registrado por um config plugin local. O widget apresenta os atalhos **+ Despesa** e **+ Receita**, sem exibir saldos ou qualquer informação financeira na tela inicial.

### Como o widget funciona nesta primeira versão

- Ao tocar em **+ Despesa** ou **+ Receita**, o Android abre o CifraWealth diretamente no formulário de Lançamento Rápido do tipo escolhido.
- O campo de valor recebe foco automaticamente.
- O formulário sugere a última categoria utilizada daquele tipo.
- O widget não registra a transação em segundo plano nesta primeira versão; o usuário revisa e salva o lançamento dentro do app.
- A próxima evolução será adicionar favoritos que possam ser registrados sem abrir a interface, com credencial nativa protegida, idempotência e sincronização confiável.

### Gerar e instalar

O widget exige um novo binário Android. Ele não aparece no Expo Go nem em APKs gerados antes da inclusão do config plugin.

```bash
npx expo prebuild --platform android
eas build -p android --profile preview
```

Depois de instalar o novo APK:
1. Pressione e segure uma área vazia da tela inicial do Android.
2. Abra **Widgets**.
3. Procure **CifraWealth - Lançamento rápido**.
4. Arraste o widget para a tela inicial.

### Teste via ADB

```bash
adb shell am start -W -a android.intent.action.VIEW -d "cifrawealth://nova-transacao?tipo=despesa" com.cifrawealth.app
adb shell am start -W -a android.intent.action.VIEW -d "cifrawealth://nova-transacao?tipo=receita" com.cifrawealth.app
```


## Widget Android — favoritos com registro em segundo plano

O widget agora oferece até quatro favoritos configuráveis. Cada favorito define nome curto, descrição, valor fixo, receita/despesa e categoria. Com a sessão do widget ativa, tocar em um favorito agenda a criação de uma transação confirmada por WorkManager, sem abrir a interface do app.

**Segurança:** o app provisiona uma credencial exclusiva do widget (não é o JWT normal do login). O backend guarda apenas o hash e limita a credencial a registrar favoritos pertencentes à conta. O Android guarda o segredo e os dados do widget cifrados com AES-GCM usando chave Android Keystore. O logout revoga a sessão no servidor e limpa o segredo local.

**Offline:** quando não há conexão, WorkManager aguarda conectividade e tenta novamente com backoff. A tarefa mantém o snapshot e a chave de idempotência da ação original. Se o favorito for editado antes da sincronização, o backend detecta a mudança e rejeita a ação em vez de registrar valores diferentes.

**Configuração:** defina `EXPO_PUBLIC_API_URL` no EAS com a URL HTTPS pública da API, incluindo `/api`. Após instalar o APK com o novo módulo:
1. Entre no CifraWealth.
2. Acesse Transações e toque no ícone de estrela.
3. Configure até quatro favoritos.
4. Adicione ou atualize o widget na tela inicial.
5. Toque em um favorito; o app não precisa abrir.

A execução do WorkManager pode ser atrasada pelo Android/Doze, políticas de bateria ou fabricante; não é uma garantia de sincronização instantânea. Esta versão é Android. O suporte iOS exige uma implementação separada com WidgetKit/App Intents.
