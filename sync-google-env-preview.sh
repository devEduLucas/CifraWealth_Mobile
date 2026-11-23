#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado na raiz do projeto mobile."
  exit 1
fi

# Carrega o .env local sem imprimir os valores no terminal.
set -a
# shellcheck disable=SC1091
source .env
set +a

required_vars=(
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
)

for name in "${required_vars[@]}"; do
  value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Variável ausente ou vazia no .env: $name"
    exit 1
  fi
  eas env:set --name "$name" --value "$value" --environment preview --visibility plaintext
 done

echo "Client IDs enviados ao ambiente Preview do EAS."
echo "Agora gere um novo APK com: eas build -p android --profile preview"
