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
