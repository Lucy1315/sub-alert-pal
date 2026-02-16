# SubReminder - 구독 결제 알림 시스템

## 📋 프로젝트 개요

**SubReminder**는 구독 서비스의 결제일을 사전에 알림(이메일/SMS)으로 통지해주는 자동화 시스템입니다.

- **프로젝트 URL**: https://sub-alert-pal.lovable.app
- **기술 스택**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **백엔드**: Lovable Cloud (Supabase)
- **타임존**: Asia/Seoul (KST)

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  ┌───────────┐ ┌──────────┐ ┌─────┐ ┌──────────┐   │
│  │ 대시보드   │ │ 구독관리  │ │로그 │ │  설정    │   │
│  └───────────┘ └──────────┘ └─────┘ └──────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase Client SDK
┌──────────────────────▼──────────────────────────────┐
│               Lovable Cloud (Supabase)               │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │  PostgreSQL   │  │  Edge Function                │ │
│  │  - subscriptions│ │  send-renewal-reminders      │ │
│  │  - notification │ │                              │ │
│  │    _logs       │ │  ┌─────────┐  ┌───────────┐  │ │
│  └──────────────┘  │  │ Resend  │  │Notification│  │ │
│                     │  │ (Email) │  │API (SMS)   │  │ │
│  ┌──────────────┐  │  └─────────┘  └───────────┘  │ │
│  │  pg_cron      │──│  매일 09:00 KST 자동 실행    │ │
│  └──────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 📊 데이터베이스 스키마

### `subscriptions` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID (PK) | 자동 생성 |
| `name` | TEXT | 구독 서비스 이름 |
| `amount` | NUMERIC | 결제 금액 |
| `currency` | TEXT | 통화 (기본: KRW) |
| `renewal_date` | DATE | 다음 결제일 |
| `notify_days_before` | INTEGER | 사전 알림 일수 (기본: 3) |
| `notify_email` | BOOLEAN | 이메일 알림 여부 |
| `notify_sms` | BOOLEAN | SMS 알림 여부 |
| `email_recipient` | TEXT | 이메일 수신자 |
| `phone_number` | TEXT | SMS 수신 번호 |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

### `notification_logs` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID (PK) | 자동 생성 |
| `subscription_id` | UUID (FK) | 구독 참조 |
| `subscription_name` | TEXT | 구독 서비스 이름 |
| `channel` | TEXT | 발송 채널 (email / sms) |
| `status` | TEXT | 발송 상태 (success / failed) |
| `recipient` | TEXT | 수신자 |
| `error_message` | TEXT | 실패 시 에러 메시지 |
| `test_run` | BOOLEAN | 테스트 모드 발송 여부 |
| `sent_at` | TIMESTAMPTZ | 발송 시각 |

---

## 🔑 사용 API 및 외부 서비스

### 1. Resend (이메일 발송)

- **용도**: 구독 갱신 알림 이메일 발송
- **API Endpoint**: `https://api.resend.com/emails`
- **인증**: Bearer Token (`RESEND_API_KEY`)
- **발신자**: `SubReminder <onboarding@resend.dev>`
- **공식 문서**: https://resend.com/docs

### 2. NotificationAPI (SMS 발송)

- **용도**: 구독 갱신 알림 SMS 발송
- **API Endpoint**: `https://api.notificationapi.com/{CLIENT_ID}/sender`
- **인증**: Basic Auth (`NOTIFICATIONAPI_CLIENT_ID:NOTIFICATIONAPI_CLIENT_SECRET`)
- **공식 문서**: https://docs.notificationapi.com

### 3. Supabase (백엔드 인프라)

- **PostgreSQL**: 구독 및 알림 로그 데이터 저장
- **Edge Functions**: 알림 발송 로직 실행
- **pg_cron + pg_net**: 매일 09:00 KST 스케줄링

---

## ⚙️ 환경변수 (Secrets)

| 변수명 | 설명 |
|---|---|
| `RESEND_API_KEY` | Resend 이메일 API 키 |
| `NOTIFICATIONAPI_CLIENT_ID` | NotificationAPI 클라이언트 ID |
| `NOTIFICATIONAPI_CLIENT_SECRET` | NotificationAPI 시크릿 키 |
| `TEST_MODE` | 테스트 모드 활성화 (`true` / `false`) |
| `TEST_PHONE_NUMBER` | 테스트 SMS 수신 번호 (E.164 형식: `+821012345678`) |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 |
| `SUPABASE_ANON_KEY` | Supabase 익명 키 |

---

## 🔄 Workflow (알림 발송 흐름)

### 자동 스케줄링

```
매일 09:00 KST
    │
    ▼
pg_cron 트리거
    │
    ▼
net.http_post() → Edge Function 호출
    │
    ▼
send-renewal-reminders 실행
    │
    ├── TEST_MODE = true?
    │       │
    │       ├── Yes → 테스트 알림 발송
    │       │         ├── Resend API → 테스트 이메일
    │       │         └── NotificationAPI → 테스트 SMS
    │       │
    │       └── No → 라이브 알림 발송
    │                 │
    │                 ▼
    │           subscriptions 테이블 조회
    │                 │
    │                 ▼
    │           각 구독별 알림 대상일 계산
    │           (renewal_date - notify_days_before = today?)
    │                 │
    │                 ├── 이메일 알림 활성 → Resend API
    │                 └── SMS 알림 활성 → NotificationAPI
    │
    ▼
notification_logs 테이블에 결과 기록
```

### 수동 테스트

Edge Function을 직접 호출하여 테스트할 수 있습니다:

```bash
curl -X POST \
  https://mjnkumkzwavirpurfxkj.supabase.co/functions/v1/send-renewal-reminders \
  -H "Authorization: Bearer {ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"force_test_mode": true, "test_email_recipient": "your@email.com"}'
```

---

## 🖥️ 프론트엔드 페이지 구성

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/` | 대시보드 | 통계 카드 (활성 구독, 이번 주 갱신, 발송 이메일/SMS 수), 최근 알림 로그 |
| `/subscriptions` | 구독 관리 | 구독 추가/삭제, 목록 조회 |
| `/logs` | 알림 로그 | 전체 발송 내역 조회 |
| `/settings` | 설정 | 운영 모드, 환경변수, 알림 채널 정보 표시 |

---

## 🧩 주요 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `AppLayout` | 사이드바 네비게이션 포함 레이아웃 |
| `DashboardStats` | 대시보드 통계 카드 (Supabase 실시간 쿼리) |
| `SubscriptionList` | 구독 CRUD (추가/삭제/목록) |
| `NotificationLogTable` | 알림 발송 로그 테이블 |
| `ModeBadge` | TEST/LIVE 모드 배지 표시 |
| `NavLink` | 네비게이션 링크 |

---

## 📝 개발 히스토리

### Phase 1: 기본 구조 구축
- React + Vite + TypeScript 프로젝트 생성
- Tailwind CSS + shadcn/ui 디자인 시스템 적용
- 다크 테마 기반 글래스모피즘 UI 구현

### Phase 2: 데이터베이스 설계
- Lovable Cloud(Supabase) 연동
- `subscriptions` 테이블 생성 (구독 정보 관리)
- `notification_logs` 테이블 생성 (알림 발송 기록)
- RLS (Row Level Security) 정책 설정

### Phase 3: 프론트엔드 대시보드
- 대시보드 통계 카드 구현 (React Query 활용)
- 구독 관리 페이지 (CRUD 기능)
- 알림 로그 조회 페이지
- 설정 페이지

### Phase 4: 알림 발송 Edge Function
- `send-renewal-reminders` Edge Function 개발
- **TEST 모드**: 시스템 상태 확인용 테스트 알림 발송
- **LIVE 모드**: 구독 데이터 기반 실제 알림 발송
- Resend API 연동 (이메일)
- NotificationAPI 연동 (SMS)

### Phase 5: 자동화 스케줄링
- `pg_cron` + `pg_net` 확장 활성화
- 매일 09:00 (Asia/Seoul) cron job 등록
- Edge Function 자동 호출 구성

### Phase 6: 테스트 및 검증
- `force_test_mode` 파라미터로 수동 테스트 지원
- `test_email_recipient` 파라미터로 테스트 수신자 지정
- `notification_logs.test_run` 컬럼으로 테스트/실제 발송 구분
- SMS 전화번호 E.164 형식 (`+821012345678`) 검증

---

## 🔒 보안

- RLS 정책으로 데이터 접근 제어
- API 키는 환경변수(Secrets)로 관리 (코드에 하드코딩하지 않음)
- Edge Function에서 `SUPABASE_SERVICE_ROLE_KEY` 사용 (서버 사이드 전용)
- CORS 헤더 설정으로 Cross-Origin 요청 제어

---

## 🚀 배포

- **프론트엔드**: Lovable 자동 배포 (https://sub-alert-pal.lovable.app)
- **Edge Function**: Lovable Cloud 자동 배포
- **데이터베이스**: Lovable Cloud (Supabase PostgreSQL)
