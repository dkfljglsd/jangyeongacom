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

접속 주소는 **항상 같습니다**:

```
https://jangyeonga.com/projects/live-translate/public/
```

백엔드는 고정 터널 `translate-api.jangyeonga.com` 으로 붙고, 그 주소가 앱에 기본값으로
들어 있어서 링크에 `?api=` 를 붙일 필요가 없습니다.

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

### 말하는 도중에 미리 번역한다

음성 인식은 말이 끝나고 잠깐 조용해야 문장을 확정합니다. 그 1 초를 기다렸다 번역을
시작하면 늦습니다. 그래서 **중간 인식 결과가 0.4 초 잠잠해질 때마다 미리 번역해 띄우고**,
문장이 확정되면 같은 말풍선을 정확한 번역으로 갈아 끼웁니다.

```
말하는 중 ──▶ 회의 자료를 금요일까지
   2.0초 ──▶ 会議資料を金曜日まで。          ← 임시 (점선 표시)
   확정  ──▶ 会議資料を金曜日まで送ってください。  ← 정확
```

임시 번역은 상대 화면에도 같은 방식으로 나타났다가 교체됩니다. 말풍선은 하나이고,
발음 표기는 확정된 뒤에만 붙습니다.

> 임시 번역에 작은 모델(`gemma3:4b`)을 쓰려다 접었습니다. 모델을 갈아끼우느라
> 임시 번역이 30 초 걸렸고, 두 모델을 같이 올려 두자 이번엔 정확한 번역이
> 1.2 초에서 2.7 초로 느려졌습니다. 속도는 "더 작은 모델"이 아니라
> "더 일찍 시작하기"로 법니다.

### 지연을 줄인 방법

측정해 보니 느림의 대부분이 모델 성능이 아니라 두 가지 설정이었습니다.

| 원인 | 조치 | 효과 (첫 글자까지) |
|---|---|---|
| 모델 두 개가 GPU 에서 서로 밀어냄 | `OLLAMA_MAX_LOADED_MODELS=1` | 4000ms → 1200ms |
| 시스템 프롬프트가 246 토큰 | 95 토큰으로 압축 | 2245ms → 1100ms |
| 컨텍스트 131072 토큰 | `num_ctx: 4096` | 약 25% 단축 |

12B 는 프롬프트를 토큰당 7ms 로 처리해서, 프롬프트 길이가 그대로 지연이 됩니다.
그래서 규칙을 줄이고 예시는 한↔일에만 남겼습니다. 다만 **줄이면 품질이 먼저 무너집니다** —
단위 지시를 빼자 `초당`이 per minute 로, `분당 20회`가 "every 20 minutes in Bundang" 으로
바뀌었습니다. 요일만 보던 벤치마크는 이걸 놓쳤고, 지금은 비율 단위 3건이 들어가 있습니다.

프롬프트를 줄일 때는 반드시 벤치를 다시 돌리세요.

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

### 고정 터널 (이미 설정됨)

`translate-api.jangyeonga.com` 이 이 맥의 `localhost:8080` 으로 연결돼 있습니다.
설정은 `~/.cloudflared/config.yml` 에 있고, 자격증명은 같은 폴더의 `<터널ID>.json` 입니다.
(자격증명 파일은 비밀입니다 — 저장소에 넣지 마세요.)

```yaml
tunnel: live-translate
credentials-file: /Users/0a/.cloudflared/<터널ID>.json
ingress:
  - hostname: translate-api.jangyeonga.com
    service: http://localhost:8080
  - service: http_status:404
```

다른 머신으로 옮기거나 처음부터 다시 만들 때:

```bash
cloudflared tunnel login
cloudflared tunnel create live-translate
cloudflared tunnel route dns live-translate translate-api.jangyeonga.com
cloudflared tunnel run live-translate
```

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

## 즉답 사전

통화에서 늘 나오는 짧은 말은 모델을 거치지 않고 **1~3ms** 에 답합니다. 답이 정해져
있는데 1~2 초를 기다릴 이유가 없고, 매번 조금씩 다르게 번역되는 것도 산만합니다.

**360여 개**가 등록돼 있습니다. 시간대별 인사가 있는 언어로 갈 때는 **말하는 시각**을
보고 고릅니다 — `안녕하세요` 가 아침엔 `おはようございます`, 낮엔 `こんにちは`,
저녁엔 `こんばんは` 로 나갑니다 (영어도 Good morning / afternoon / evening).
반대 방향에서는 셋 다 `안녕하세요` 입니다. 이 항목은 캐시보다 먼저 처리해서
한 번 나온 인사가 하루 종일 굳지 않습니다.

- 통화 핵심 표현 (한/영/일 3방향): 여보세요 · 네 · 알겠습니다 · 잠시만요 ·
  들리세요? · 지금 통화 괜찮으세요? · 이만 끊을게요 … (`phrasebook.js`)
- 일본어 상용 표현 (한↔일): 인사·사과·감정·성향·연애·돈·충고 등 342개
  (`phrases-ja-ko.js`)

뜻풀이에 여러 표현이 붙어 있으면(`頑張って` → "힘내! 열심히 해! 파이팅!") 전부
검색어로 등록하고 첫 번째만 내보냅니다. **한 글자 한국어 표제어는 넣지 않습니다** —
"와"(おいで)나 "상"(ご褒美) 같은 게 일상 발화를 가로채기 때문입니다.

**발화 전체가 정확히 일치할 때만** 씁니다. 부분 일치를 허용하면 "네 개 주세요" 가
"Yes" 로 새기 때문입니다. 조금이라도 다르면 모델이 번역합니다:

```
네                    → はい。                    2ms   (사전)
네 개 주세요            → はい、4つお願いします。        1685ms (모델)
잠시만요                → 少々お待ちください。          2ms   (사전)
잠시만요 자료 좀 찾아볼게요  → ちょっと待ってください、資料を探します。 2083ms (모델)
```

## 웃음·감탄 표현

`ㅋㅋ` `www` `haha` 같은 말은 번역 대상이 아니라 **대응 표기로 바꿉니다.** 모델에 맡기면
엉뚱해집니다 — 실제로 `www` 와 `笑` 가 "네." 로, `ㅠㅠ` 가 "ええ、大丈夫ですよ。" 로 나왔습니다.

길이는 1:1로 옮깁니다. `w` 하나가 `ㅋ` 하나입니다.

| 한국어 | 일본어 | 영어 |
|---|---|---|
| ㅋㅋ | ww | haha |
| ㅋㅋㅋ | www | hahaha |
| ㅠㅠ | (泣) | :( |
| ㅇㅇ | うん | yeah |

규칙 기반이라 **2ms** 에 끝나고 모델을 거치지 않습니다. 문장에 섞인 경우
(`ㅋㅋ 그래서 어떻게 됐어`)는 그대로 모델이 번역합니다.

## 노트북에서의 크기

화면이 760px 보다 넓으면 앱을 **휴대폰 폭(기본 420px)으로 가운데 세웁니다.** 통화 화면은
손에 쥐는 비율이라, 가로로 늘어나면 자막이 화면 양 끝으로 벌어져 읽기 어렵습니다.

양옆의 손잡이를 끌어 폭을 바꿀 수 있고(320~900px), **더블클릭하면 기본값으로 돌아갑니다.**
정한 폭은 브라우저에 저장됩니다. 가운데 정렬이라 한쪽을 끌면 반대쪽도 같이 움직입니다.

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
