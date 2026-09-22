#!/bin/bash
# 통역 전화 관련 프로세스를 정리한다. Ollama 는 다른 작업에도 쓰므로 함께 끄지 않는다.
pkill -f "cloudflared tunnel" 2>/dev/null
pkill -f "node server.js" 2>/dev/null
printf '\033[32m껐습니다.\033[0m (Ollama 는 그대로 둡니다)\n'
sleep 1
