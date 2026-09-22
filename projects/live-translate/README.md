# 🗣️ 동시통역 통화 (live-translate)

브라우저끼리 음성 통화(WebRTC)를 하면서, 각자의 말이 **상대 언어로 실시간 번역**되어
자막 + 음성(TTS)으로 전달됩니다. 번역은 **내 서버의 Ollama**에서 돌아갑니다.

```
[내 마이크] → Web Speech STT → /api/translate → Ollama → WebSocket → [상대 자막 + TTS]
[내 목소리] ────────── WebRTC 오디오 ──────────────────────→ [상대 스피커]
```

## 평소 사용법 (맥에서)

Finder 에서 **`통역전화 켜기.command`** 를 더블클릭하면 끝입니다. Ollama → 번역 서버 →
외부 접속 터널을 차례로 켜고, 접속 링크를 클립보드에 복사한 뒤 Chrome 으로 열어 줍니다.

```
🗣️  동시통역 통화 시작

1/3  Ollama  이미 실행 중
2/3  번역 서버 시작하는 중…
3/3  외부 접속 주소 받는 중…

✅ 준비 끝
  https://jangyeonga.com/projects/live-translate/public/?api=https://....trycloudflare.com
```

1. 뜬 링크가 Chrome 에 열립니다. **6자리 내 번호**가 생깁니다.
2. 같은 링크를 상대(또는 내 휴대폰)에게 보냅니다. 링크에 서버 주소가 들어 있어서,
   받는 사람은 열기만 하면 됩니다.
3. 상대 번호를 넣고 📞 를 누르면 상대 화면에서 벨이 울립니다.

끌 때는 그 검은 창에서 **Ctrl+C**, 또는 **`통역전화 끄기.command`** 를 더블클릭합니다.

> 터널 주소(`....trycloudflare.com`)는 **켤 때마다 바뀝니다.** 그래서 켤 때마다 나오는
> 새 링크를 상대에게 다시 보내야 합니다. 고정 주소로 만들려면 아래 "고정 주소" 참고.

## 빠른 시작 (로컬)

```bash
ollama serve
ollama pull gemma3:4b
npm install
npm start          # http://localhost:8080
```

접속하면 **내 번호**(6자리)가 생깁니다. 상대에게 그 번호를 알려주면 상대가 걸 수 있고,
상대 번호를 넣고 📞 를 누르면 상대 화면에 벨이 울립니다. 받으면 통화가 연결됩니다.
Chrome/Edge 필요 (음성 인식은 Web Speech API 사용).

## 설정

`.env.example` 참고 — 환경변수로 넘깁니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8080` | 서버 포트 |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 주소 |
| `OLLAMA_MODEL` | `gemma3:12b` | 기본 번역 모델 |

### 모델 선택 — 실측 근거

한/영/일 6개 방향 × 요일 7개 × 문장 3종 = 126건 + 숫자·고유명사 보존 8건으로
`bench.mjs` 를 돌려 정했습니다 (Apple Silicon, temperature 0).

| 모델 | 요일 정확도 | 보존 | 지연 중앙값 | 크기 |
|---|---|---|---|---|
| **gemma3:12b** (기본값) | **126/126 (100%)** | **8/8** | 1996ms | 8.1GB |
| gemma3:4b | 119/126 (94%) | 8/8 | **795ms** | 3.3GB |
| qwen2.5:7b-instruct | 111/126 (88%) | 7/8 | 563ms | 4.7GB |
| qwen2.5:1.5b-instruct | 측정 중단 (영→한 21%) | — | 346ms | 1.0GB |

통화의 핵심이 약속 잡기라 **요일 오역을 최우선 기준**으로 삼았고, 그래서 느리지만
정확한 12b 를 기본값으로 둡니다. 2초 가까운 지연은 번역을 **스트리밍**해 덮습니다 —
글자가 생성되는 대로 자막에 흘러나오므로 빈 화면을 기다리지 않습니다.
속도가 더 급하면 로비의 번역 모델에서 `gemma3:4b` 를 직접 고르세요.

`qwen2.5:7b-instruct` 는 **영→한 요일을 15/21 밖에 못 맞춥니다**. Tuesday·Wednesday·
Thursday·Friday·Sunday 를 전부 "토요일"로 옮기고, `the reactor power is 1400 megawatts`
에는 중국어(`반응堆的功率是1400兆瓦`)를 섞습니다. 프롬프트 구조를 4가지로 바꾸고
temperature 0 으로 고정해도 재현되는 모델 자체의 결함입니다.

작은 모델은 목표 언어를 자주 흘립니다. 그래서 시스템 프롬프트에 **목표 언어별 규칙**
(일본어에 중국어 어휘 금지, 한국어에 가나·한자 금지, 전화 인사 = もしもし / 여보세요)과
**방향별 예시 몇 개**를 넣었습니다. 예시에는 요일·날짜를 일부러 넣지 않았습니다 —
벤치마크 문장과 겹치면 모델이 패턴만 따라해 점수가 부풀려집니다. 실제로 그렇게
측정했다가 96%/100% 라는 과장된 수치가 나왔고, 예문에서 요일을 빼자 94%/100% 가
나왔습니다.

모델을 바꿀 때는 반드시 다시 돌려보세요:

```bash
node bench.mjs <새-모델> gemma3:12b
```

## jangyeonga.com 배포 구성 (프론트 분리)

Ollama 는 모델 파일이 수 GB 라 Cloudflare Pages 같은 정적 호스팅에서 돌릴 수 없습니다.
그래서 **프론트엔드만 정적 호스팅에 올리고, 번역·시그널링 백엔드는 Ollama 가 깔린
내 머신에서 돌린 뒤 터널로 연결**합니다.

```
브라우저 ──HTTPS──> jangyeonga.com/projects/live-translate/   (정적: Cloudflare Pages)
        └─API/WS──> translate-api.jangyeonga.com              (내 맥: Node + Ollama)
```

로비의 **번역 서버 주소** 칸에 백엔드 주소를 넣으면 됩니다 (localStorage 에 저장되고,
`?api=https://...` 쿼리로도 지정 가능). 비워두면 이 페이지를 준 서버를 씁니다.

### 고정 주소 (터널이 매번 바뀌는 문제)

`통역전화 켜기.command` 가 쓰는 건 로그인 없이 쓰는 **임시 터널**이라, 켤 때마다 주소가
바뀌고 몇 시간 뒤 만료됩니다. 링크를 한 번 정해두고 계속 쓰려면 이름 있는 터널을
만들어 `translate-api.jangyeonga.com` 에 붙이면 됩니다. Cloudflare 로그인 한 번과
DNS 레코드 하나가 필요합니다.

### 백엔드를 터널로 노출하기

```bash
brew install cloudflared     # 또는 https://github.com/cloudflare/cloudflared 릴리스
cloudflared tunnel login
cloudflared tunnel create live-translate
cloudflared tunnel route dns live-translate translate-api.jangyeonga.com
cloudflared tunnel run --url http://localhost:8080 live-translate
```

터널은 WebSocket 을 그대로 통과시키므로 시그널링도 함께 동작합니다.
포트 개방이나 공인 IP 가 필요 없고, 인증서도 Cloudflare 가 처리합니다.

### 출처 제한

백엔드는 기본적으로 모든 출처를 허용합니다. 공개 도메인에 붙일 때는 반드시 제한하세요.

```bash
ALLOW_ORIGIN=https://jangyeonga.com npm start
```

`ALLOW_ORIGIN` 은 콤마로 여러 개를 나열할 수 있고, HTTP API 와 WebSocket 모두에 적용됩니다.
이 API 는 쿠키·자격증명을 받지 않습니다.

> 백엔드가 꺼져 있으면 로비에 "번역 서버에 연결할 수 없습니다" 가 뜨고 주소 입력칸이
> 자동으로 펼쳐집니다. 통화 자체도 시그널링 서버가 필요하므로 백엔드 없이는 동작하지 않습니다.

## 단독 서버에 전부 올리기

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

## 발음 표기

자막 윗줄(상대 언어) 아래에 그 말을 어떻게 읽는지 적습니다. **읽는 사람의 문자**로
적기 때문에, 한국어 사용자에게는 한글, 영어 사용자에게는 로마자, 일본어 사용자에게는
가타카나가 나갑니다.

| 적을 말 → 읽는 사람 | 결과 |
|---|---|
| 영어 → 한국어 | `Hello, can you hear me?` → 헐로우, 캔 유 히어 미? |
| 일본어 → 한국어 | `もしもし。今お電話大丈夫ですか？` → 모시모시. 콘오덴와다이조우부데스카? |
| 한국어 → 영어 | `여보세요 지금 통화 괜찮으세요` → yeoboseyo jigeum tonghwa gwaenchanheuseyo |
| 한국어 → 일본어 | `여보세요 지금 통화 괜찮으세요` → ヨボセヨ ジグム トンファ グェンチャンウセヨ |
| 영어 → 일본어 | `Hello, can you hear me?` → ハロウ, カン ユー ヒー ミー? |
| 일본어 → 영어 | `もしもし。今お電話大丈夫ですか？` → moshimoshi. kon o denwa daijoubu desu ka? |

전부 사전·규칙 기반이라 LLM 호출이 없고 즉시 응답합니다. 영어는 CMU 발음사전,
일본어는 kuromoji 형태소 분석, 한국어는 국어의 로마자 표기법과 가나 근사를 씁니다.

## 채팅 입력

통화 화면 아래 입력칸에 타자로 써도 똑같이 번역돼 상대에게 갑니다. 시끄러운 곳,
발음이 잘 안 잡히는 고유명사, 음성 인식이 없는 브라우저에서 쓰는 길입니다.
입력칸에 커서가 있는 동안에는 음성 인식을 멈춰서, 타자와 말이 겹쳐 들어가지 않습니다.

## 알아둘 점

- **STT는 Chrome의 Web Speech API**라 구글 서버를 거칩니다. 완전 오프라인이 필요하면
  `public/app.js`의 `startRecognition()`을 로컬 Whisper(faster-whisper) WebSocket 스트리밍으로
  교체하면 됩니다. 번역/시그널링 쪽은 그대로 씁니다.
- 방 하나에 **2명**까지입니다 (`server.js`의 `room.size >= 2`).
- 번역 음성(TTS)은 쓰지 않습니다. 상대의 실제 목소리가 그대로 들리고, 번역은 자막으로만
  나옵니다. 합성 음성을 겹쳐 틀면 통화 느낌이 깨지고 자기 마이크로 되돌아 들어가는
  문제도 생깁니다.
- 같은 문장은 서버에서 캐시하므로 반복 발화는 즉시 응답합니다.
