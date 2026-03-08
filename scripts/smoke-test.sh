#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# MARMAQ Smoke Test
# Verifica que las rutas criticas de la app estan funcionando
# despues de cada deploy.
#
# Uso:
#   ./scripts/smoke-test.sh          → produccion (www.marmaq.app)
#   ./scripts/smoke-test.sh local    → localhost:3000
#   ./scripts/smoke-test.sh <URL>    → URL custom
# ═══════════════════════════════════════════════════════════════

# --- Configuracion ---
PROD_URL="https://www.marmaq.app"
LOCAL_URL="http://localhost:3000"

if [[ "${1:-}" == "local" ]]; then
  BASE_URL="$LOCAL_URL"
elif [[ -n "${1:-}" ]]; then
  BASE_URL="$1"
else
  BASE_URL="$PROD_URL"
fi

COOKIE_JAR=$(mktemp)
RESPONSE_BODY=$(mktemp)
trap 'rm -f "$COOKIE_JAR" "$RESPONSE_BODY"' EXIT

PASSED=0
FAILED=0
TOTAL=0
CREATED_ORDER_ID=""

# --- Colores (solo si la terminal soporta) ---
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN='' RED='' YELLOW='' CYAN='' BOLD='' NC=''
fi

# --- Funciones auxiliares ---
pass() {
  PASSED=$((PASSED + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${GREEN}✅ $1${NC}"
}

fail() {
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${RED}❌ $1${NC}"
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}$1${NC}"
}

# check_status <description> <expected_status> <method> <url> [extra_curl_args...]
check_status() {
  local desc="$1"
  local expected="$2"
  local method="$3"
  local url="$4"
  shift 4

  local status
  status=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
    -X "$method" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    --max-time 30 \
    "$@" \
    "$url" 2>/dev/null) || status="000"

  if [[ "$status" == "$expected" ]]; then
    pass "$desc ($status)"
    return 0
  else
    fail "$desc ($status) — Expected $expected"
    return 1
  fi
}

# check_body_contains <substring>
# Must be called immediately after check_status
check_body_contains() {
  if grep -q "$1" "$RESPONSE_BODY" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}🔍 MARMAQ Smoke Test — $BASE_URL${NC}"
echo "================================================"

# ═══════════════════════════════════════════════════════════════
# 1. PAGINAS PUBLICAS
# ═══════════════════════════════════════════════════════════════
section "📄 Paginas publicas"

# Login page
check_status "Login page" "200" "GET" "$BASE_URL/login" \
  -L || true

# Auth providers
if check_status "Auth providers" "200" "GET" "$BASE_URL/api/auth/providers"; then
  if ! check_body_contains "credentials"; then
    fail "Auth providers — body no contiene 'credentials'"
    PASSED=$((PASSED - 1))
    FAILED=$((FAILED + 1))
  fi
fi

# CSRF token
if check_status "CSRF token" "200" "GET" "$BASE_URL/api/auth/csrf"; then
  if ! check_body_contains "csrfToken"; then
    fail "CSRF token — body no contiene 'csrfToken'"
    PASSED=$((PASSED - 1))
    FAILED=$((FAILED + 1))
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 2. AUTH FLOW
# ═══════════════════════════════════════════════════════════════
section "🔐 Autenticacion"

# Obtener CSRF token
CSRF_TOKEN=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/api/auth/csrf" 2>/dev/null \
  | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4) || CSRF_TOKEN=""

if [[ -z "$CSRF_TOKEN" ]]; then
  fail "Obtener CSRF token para login"
  echo -e "  ${YELLOW}⚠️  Sin CSRF token, saltando checks autenticados${NC}"
  # Contar los checks que se saltaron
  SKIPPED_AUTH=11
  TOTAL=$((TOTAL + SKIPPED_AUTH))
  FAILED=$((FAILED + SKIPPED_AUTH))
else
  # Login
  LOGIN_STATUS=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
    -X POST \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --max-time 30 \
    -d "csrfToken=$CSRF_TOKEN&email=test.admin%40marmaq.mx&password=MBHAdmin&json=true&callbackUrl=$BASE_URL" \
    "$BASE_URL/api/auth/callback/credentials" 2>/dev/null) || LOGIN_STATUS="000"

  # NextAuth callback returns 200 on success (with JSON redirect)
  if [[ "$LOGIN_STATUS" == "200" || "$LOGIN_STATUS" == "302" ]]; then
    pass "Login como test.admin@marmaq.mx ($LOGIN_STATUS)"
  else
    fail "Login como test.admin@marmaq.mx ($LOGIN_STATUS) — Expected 200 or 302"
  fi

  # Verificar session
  SESSION_STATUS=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    --max-time 15 \
    "$BASE_URL/api/auth/session" 2>/dev/null) || SESSION_STATUS="000"

  if [[ "$SESSION_STATUS" == "200" ]] && check_body_contains "test.admin@marmaq.mx"; then
    pass "Session valida"
  else
    fail "Session valida ($SESSION_STATUS) — Expected 200 con test.admin@marmaq.mx"
  fi

  # ═══════════════════════════════════════════════════════════════
  # 3. RUTAS PROTEGIDAS
  # ═══════════════════════════════════════════════════════════════
  section "📋 APIs protegidas"

  check_status "GET /api/ordenes" "200" "GET" \
    "$BASE_URL/api/ordenes" || true

  if check_status "GET /api/ordenes?page=1&pageSize=5" "200" "GET" \
    "$BASE_URL/api/ordenes?page=1&pageSize=5"; then
    if ! check_body_contains "ordenes"; then
      fail "GET /api/ordenes — body no contiene 'ordenes'"
      PASSED=$((PASSED - 1))
      FAILED=$((FAILED + 1))
    fi
  fi

  check_status "GET /api/dashboard/stats" "200" "GET" \
    "$BASE_URL/api/dashboard/stats" || true

  check_status "GET /api/notificaciones?limit=5" "200" "GET" \
    "$BASE_URL/api/notificaciones?limit=5" || true

  check_status "GET /api/usuarios?role=TECNICO" "200" "GET" \
    "$BASE_URL/api/usuarios?role=TECNICO" || true

  check_status "GET /api/chat/conversaciones" "200" "GET" \
    "$BASE_URL/api/chat/conversaciones" || true

  # ═══════════════════════════════════════════════════════════════
  # 4. FUNCIONALIDAD CRITICA
  # ═══════════════════════════════════════════════════════════════
  section "🏭 Funcionalidad critica"

  # Crear orden de prueba
  ORDER_BODY='{
    "clienteNuevo": { "nombre": "SMOKE TEST", "telefono": "0000000000" },
    "marcaEquipo": "Test",
    "modeloEquipo": "Test",
    "tipoServicio": "POR_COBRAR",
    "fallaReportada": "Smoke test automatico — se puede eliminar",
    "sucursal": "MEXICALTZINGO"
  }'

  CREATE_STATUS=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
    -X POST \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    --max-time 30 \
    -d "$ORDER_BODY" \
    "$BASE_URL/api/ordenes" 2>/dev/null) || CREATE_STATUS="000"

  if [[ "$CREATE_STATUS" == "201" ]]; then
    # Extraer ID y folio
    CREATED_ORDER_ID=$(grep -o '"id":"[^"]*"' "$RESPONSE_BODY" | head -1 | cut -d'"' -f4) || CREATED_ORDER_ID=""
    CREATED_FOLIO=$(grep -o '"folio":"[^"]*"' "$RESPONSE_BODY" | head -1 | cut -d'"' -f4) || CREATED_FOLIO=""
    pass "Crear orden de prueba (201) → ${CREATED_FOLIO:-sin folio}"
  else
    fail "Crear orden de prueba ($CREATE_STATUS) — Expected 201"
  fi

  if [[ -n "$CREATED_ORDER_ID" ]]; then
    # Obtener orden creada
    check_status "Obtener orden $CREATED_FOLIO" "200" "GET" \
      "$BASE_URL/api/ordenes/$CREATED_ORDER_ID" || true

    # Generar PDF comprobante
    PDF_STATUS=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      --max-time 30 \
      -D - \
      "$BASE_URL/api/ordenes/$CREATED_ORDER_ID/pdf?tipo=comprobante" 2>/dev/null)

    # El status viene al final del output de -D, extraemos de -w
    PDF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      --max-time 30 \
      "$BASE_URL/api/ordenes/$CREATED_ORDER_ID/pdf?tipo=comprobante" 2>/dev/null) || PDF_STATUS="000"

    if [[ "$PDF_STATUS" == "200" ]]; then
      pass "Generar PDF comprobante (200)"
    else
      fail "Generar PDF comprobante ($PDF_STATUS) — Expected 200"
    fi

    # Limpiar: DELETE (soft-delete → CANCELADO)
    DELETE_STATUS=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
      -X DELETE \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      --max-time 15 \
      "$BASE_URL/api/ordenes/$CREATED_ORDER_ID" 2>/dev/null) || DELETE_STATUS="000"

    if [[ "$DELETE_STATUS" == "200" ]]; then
      pass "Limpiar orden de prueba (200)"
    else
      fail "Limpiar orden de prueba ($DELETE_STATUS) — Expected 200"
    fi
  else
    fail "Obtener orden (sin ID — creacion fallo)"
    fail "Generar PDF (sin ID — creacion fallo)"
    fail "Limpiar orden de prueba (sin ID — creacion fallo)"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 5. SUPABASE STORAGE
# ═══════════════════════════════════════════════════════════════
section "☁️  Supabase Storage"

STORAGE_URL="https://rwlixjvfvjfyxydovfoh.supabase.co/storage/v1/object/public/evidencias/"
STORAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  "$STORAGE_URL" 2>/dev/null) || STORAGE_STATUS="000"

if [[ "$STORAGE_STATUS" != "000" ]]; then
  pass "Supabase Storage accesible ($STORAGE_STATUS)"
else
  fail "Supabase Storage — timeout o sin respuesta"
fi

# ═══════════════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════════════
echo ""
echo "================================================"
if [[ "$FAILED" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}✅ $PASSED/$TOTAL checks passed${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}❌ $PASSED/$TOTAL checks passed ($FAILED failed)${NC}"
  exit 1
fi
