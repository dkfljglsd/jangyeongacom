# 🗣️ 동시통역 통화 (live-translate)

브라우저끼리 음성 통화(WebRTC)를 하면서, 각자의 말이 **상대 언어로 실시간 번역**되어
자막 + 음성(TTS)으로 전달됩니다. 번역은 **내 서버의 Ollama**에서 돌아갑니다.

```
[내 마이크] → Web Speech STT → /api/translate → Ollama → WebSocket → [상대 자막 + TTS]
[내 목소리] ────────── WebRTC 오디오 ──────────────────────→ [상대 스피커]
```

## 빠른 시작 (로컬)

```bash
ollama serve
ollama pull gemma3:4b
npm install
npm start          # http://localhost:8080
```

브라우저 두 개(또는 두 기기)에서 **같은 방 이름**으로 접속하면 통화가 시작됩니다.
Chrome/Edge 필요 (음성 인식은 Web Speech API 사용).

## 설정

`.env.example` 참고 — 환경변수로 넘깁니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8080` | 서버 포트 |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 주소 |
| `OLLAMA_MODEL` | `gemma3:4b` | 기본 번역 모델 |

### 모델 선택 — 실측 근거

한/영/일 6개 방향 × 요일 7개 × 문장 3종 = 126건 + 숫자·고유명사 보존 8건으로
`bench.mjs` 를 돌려 정한 기본값입니다 (Apple Silicon, temperature 0).

| 모델 | 요일 정확도 | 보존 | 지연 중앙값 | 크기 |
|---|---|---|---|---|
| **gemma3:4b** (기본값) | **122/126 (97%)** | **8/8** | **489ms** | 3.3GB |
| qwen2.5:7b-instruct | 111/126 (88%) | 7/8 | 563ms | 4.7GB |
| qwen2.5:1.5b-instruct | 측정 중단 (영→한 21%) | — | 346ms | 1.0GB |

`qwen2.5:7b-instruct` 는 **영→한 요일을 15/21 밖에 못 맞춥니다**. Tuesday·Wednesday·
Thursday·Friday·Sunday 를 전부 "토요일"로 옮기고, `the reactor power is 1400 megawatts`
에는 중국어(`반응堆的功率是1400兆瓦`)를 섞습니다. 프롬프트 구조를 4가지로 바꾸고
temperature 0 으로 고정해도 재현되는 모델 자체의 결함이라 기본값에서 제외했습니다.

통화에서 약속 잡는 대화가 핵심이라 **요일 오역을 최우선 기준**으로 삼았습니다.
모델을 바꿀 때는 반드시 다시 돌려보세요:

```bash
node bench.mjs <새-모델> gemma3:4b
```

gemma3:4b 에 남은 오답 4건은 전부 한↔일 조합입니다 (목요일→水曜日 등).
한↔일이 주 용도라면 더 큰 모델(`gemma3:12b`, 8.1GB)을 같은 벤치로 확인해 보세요.

## 내 도메인에 올리기

브라우저 마이크(getUserMedia)와 음성 인식은 **HTTPS에서만** 동작합니다.
앱은 평문 HTTP로 띄우고 앞단에 리버스 프록시로 TLS를 붙이세요.

### 1) 서비스 상시 실행 (systemd)

`/etc/systemd/system/live-translate.service`

```ini
[Unit]
Description=live-translate
After=network.target

[Service]
WorkingDirectory=/srv/live-translate
ExecStart=/usr/bin/node server.js
Environment=PORT=8080
Environment=OLLAMA_HOST=http://127.0.0.1:11434
Environment=OLLAMA_MODEL=gemma3:4b
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now live-translate
```

### 2) TLS 리버스 프록시

**Caddy (가장 간단 — 인증서 자동)** `/etc/caddy/Caddyfile`

```
translate.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

**nginx** — WebSocket 업그레이드 헤더가 반드시 필요합니다.

```nginx
server {
    listen 443 ssl http2;
    server_name translate.example.com;

    ssl_certificate     /etc/letsencrypt/live/translate.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/translate.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

### 3) NAT/방화벽 뒤 사용자를 위한 TURN (선택)

기본은 Google STUN만 씁니다. 회사망/모바일망 등에서 연결이 안 되면
TURN 서버(coturn)를 올리고 `public/app.js`의 `iceServers`에 추가하세요.

```js
iceServers: [
  { urls: ['stun:stun.l.google.com:19302'] },
  { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
]
```

## 알아둘 점

- **STT는 Chrome의 Web Speech API**라 구글 서버를 거칩니다. 완전 오프라인이 필요하면
  `public/app.js`의 `startRecognition()`을 로컬 Whisper(faster-whisper) WebSocket 스트리밍으로
  교체하면 됩니다. 번역/시그널링 쪽은 그대로 씁니다.
- 방 하나에 **2명**까지입니다 (`server.js`의 `room.size >= 2`).
- 번역 음성(TTS)이 내 마이크로 되돌아 들어가는 것을 막기 위해, TTS 재생 중에는
  음성 인식을 잠시 멈추고 상대 원음 볼륨을 낮춥니다.
- 같은 문장은 서버에서 캐시하므로 반복 발화는 즉시 응답합니다.
