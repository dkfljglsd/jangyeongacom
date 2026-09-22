#!/bin/bash
# 동시통역 통화 — 필요한 것을 전부 켜고 접속 링크를 띄운다.
# Finder 에서 더블클릭하면 실행된다. 창을 닫거나 Ctrl+C 를 누르면 전부 꺼진다.

cd "$(dirname "$0")" || exit 1

OLLAMA="$HOME/.local/ollama/ollama"
CLOUDFLARED="$HOME/.local/cloudflared/cloudflared"
SITE="https://jangyeonga.com/projects/live-translate/public/"
LOG_DIR="$HOME/.local/live-translate-logs"
mkdir -p "$LOG_DIR"

green() { printf '\033[32m%s\033[0m\n' "$1"; }
gray()  { printf '\033[90m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }

cleanup() {
  echo
  gray "끄는 중…"
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  gray "종료했습니다. (Ollama 는 그대로 둡니다)"
  exit 0
}
trap cleanup INT TERM

clear
green "🗣️  동시통역 통화 시작"
echo

# ── 1. Ollama ───────────────────────────────────────────────
# 모델을 여러 개 동시에 올리면 GPU 에서 서로 밀어내 번역이 4 배까지 느려진다.
# 한 번에 하나만 올리도록 못 박는다.
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_NUM_PARALLEL=1

if pgrep -f "ollama serve" >/dev/null; then
  gray "1/3  Ollama  이미 실행 중"
else
  gray "1/3  Ollama  시작하는 중…"
  nohup "$OLLAMA" serve > "$LOG_DIR/ollama.log" 2>&1 &
  for _ in $(seq 1 20); do
    curl -s --max-time 1 http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break
    sleep 1
  done
fi
if ! curl -s --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  red "Ollama 를 시작하지 못했습니다. $LOG_DIR/ollama.log 를 확인하세요."
  read -r -p "엔터를 누르면 닫힙니다..."
  exit 1
fi

# ── 2. 번역 서버 ────────────────────────────────────────────
gray "2/3  번역 서버 시작하는 중…"
pkill -f "node server.js" 2>/dev/null
sleep 1
node server.js > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 20); do
  curl -s --max-time 1 http://127.0.0.1:8080/api/health >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -s --max-time 3 http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
  red "번역 서버가 뜨지 않았습니다. $LOG_DIR/server.log 를 확인하세요."
  read -r -p "엔터를 누르면 닫힙니다..."
  exit 1
fi

# ── 3. 외부 접속용 고정 터널 ────────────────────────────────
gray "3/3  외부 접속 터널 여는 중…"
TUNNEL_LOG="$LOG_DIR/tunnel.log"
: > "$TUNNEL_LOG"
"$CLOUDFLARED" tunnel run live-translate > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

API="https://translate-api.jangyeonga.com"
READY=0
for _ in $(seq 1 30); do
  if curl -s --max-time 3 "$API/api/health" | grep -q '"ok":true'; then READY=1; break; fi
  sleep 1
done
if [ "$READY" -eq 0 ]; then
  red "고정 주소가 아직 응답하지 않습니다. $TUNNEL_LOG 를 확인하세요."
  cleanup
fi

LINK="$SITE"

clear
green "✅ 준비 끝"
echo
echo "  아래 주소로 접속하세요. 주소는 항상 같습니다."
echo
printf '\033[36m  %s\033[0m\n' "$LINK"
echo
gray "  · 휴대폰에서도 같은 주소를 열면 됩니다."
gray "  · 접속하면 생기는 6자리 번호를 상대에게 알려주세요."
gray "  · 이 창을 닫으면 통화 서버도 함께 꺼집니다."
echo

printf '%s' "$LINK" | pbcopy 2>/dev/null
open -a "Google Chrome" "$LINK" 2>/dev/null || open "$LINK"

# 창을 열어 둔 채 대기 — 창을 닫거나 Ctrl+C 하면 cleanup 이 돈다
gray "  (끄려면 이 창에서 Ctrl+C)"
wait "$TUNNEL_PID"
