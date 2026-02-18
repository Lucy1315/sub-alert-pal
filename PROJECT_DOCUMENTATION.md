# SubReminder - 구독 결제 알림 시스템

## 📋 프로젝트 개요

**SubReminder**는 구독 서비스의 결제일을 사전에 알림(이메일/SMS)으로 통지해주는 자동화 시스템입니다. 사용자별 인증 기반으로 구독을 관리하며, 유연한 알림 규칙(offset_days × channel)으로 세밀한 알림 스케줄을 지원합니다.

- **프로젝트 URL**: https://sub-alert-pal.lovable.app
- **기술 스택**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **백엔드**: Lovable Cloud (Supabase)
- **인증**: Supabase Auth (이메일 로그인)
- **타임존**: Asia/Seoul (KST)

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────┐ ┌────────┐ ┌──────────┐ ┌─────┐ ┌──────┐    │
│  │ Auth │ │대시보드 │ │ 구독관리  │ │로그 │ │ 설정 │    │
│  └──────┘ └────────┘ └──────────┘ └─────┘ └──────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ Supabase Client SDK + Auth
┌──────────────────────▼──────────────────────────────────┐
│               Lovable Cloud (Supabase)                   │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  Supabase Auth    │  │  Edge Function                │ │
│  │  (이메일 로그인)   │  │  send-renewal-reminders      │ │
│  └──────────────────┘  │                              │ │
│                         │  ┌─────────┐  ┌───────────┐  │ │
│  ┌──────────────────┐  │  │ Resend  │  │Notification│  │ │
│  │  PostgreSQL       │  │  │ (Email) │  │API (SMS)   │  │ │
│  │  - profiles       │  │  └─────────┘  └───────────┘  │ │
│  │  - subscriptions  │  └──────────────────────────────┘ │
│  │  - reminder_rules │                                   │
│  │  - notification   │  ┌──────────────────────────────┐ │
│  │    _logs          │  │  pg_cron + pg_net             │ │
│  └──────────────────┘  │  매일 09:00 KST 자동 실행      │ │
│                         └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🔐 인증 시스템

- **Supabase Auth** 이메일/비밀번호 로그인
- 회원가입 시 `profiles` 테이블에 자동 프로필 생성 (DB 트리거)
- 모든 페이지는 인증 필수 (ProtectedRoute)
- 프론트엔드에서 `useAuth` 훅으로 세션 관리

---

## 📊 데이터베이스 스키마

### `profiles` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID (PK) | 자동 생성 |
| `user_id` | UUID (UNIQUE, FK → auth.users) | 사용자 ID |
| `display_name` | TEXT | 표시 이름 |
| `phone_number` | TEXT | SMS 수신 번호 (E.164 형식) |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

### `subscriptions` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID (PK) | 자동 생성 |
| `user_id` | UUID (FK → auth.users) | 소유 사용자 |
| `service_name` | TEXT | 구독 서비스 이름 (예: Netflix) |
| `plan_name` | TEXT | 플랜 이름 (예: Premium) |
| `renewal_date` | DATE | 다음 결제일 |
| `billing_cycle` | TEXT | 결제 주기 (monthly/yearly/weekly/quarterly) |
| `price` | NUMERIC | 결제 금액 |
| `currency` | TEXT | 통화 (기본: KRW) |
| `status` | TEXT | 상태 (active/cancelled/paused) |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

### `reminder_rules` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID (PK) | 자동 생성 |
| `subscription_id` | UUID (FK → subscriptions, CASCADE) | 구독 참조 |
| `offset_days` | INTEGER | 결제일 N일 전 (7, 3, 1, 0) |
| `channel` | TEXT | 알림 채널 (`email` 또는 `sms`) |
| `enabled` | BOOLEAN | 활성화 여부 |
| `created_at` | TIMESTAMPTZ | 생성일시 |

**UNIQUE 제약조건**: `(subscription_id, offset_days, channel)` — 동일 구독에 같은 offset+채널 중복 방지

### `notification_logs` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID (PK) | 자동 생성 |
| `user_id` | UUID (FK → auth.users) | 사용자 |
| `subscription_id` | UUID (FK → subscriptions) | 구독 참조 |
| `subscription_name` | TEXT | 구독 서비스 이름 |
| `channel` | TEXT | 발송 채널 (email / sms) |
| `status` | TEXT | 발송 상태 (success / failed) |
| `recipient` | TEXT | 수신자 |
| `error_message` | TEXT | 실패 시 에러 메시지 |
| `test_run` | BOOLEAN | 테스트 발송 여부 |
| `sent_date` | DATE | 발송 날짜 |
| `offset_days` | INTEGER | 알림 offset |
| `sent_at` | TIMESTAMPTZ | 발송 시각 |

**UNIQUE 제약조건**: `(subscription_id, channel, sent_date, offset_days)` — 동일 알림 중복 발송 방지

---

## 🔒 RLS (Row Level Security) 정책

| 테이블 | 정책 |
|---|---|
| `profiles` | 사용자 본인 프로필만 SELECT/INSERT/UPDATE/DELETE |
| `subscriptions` | 사용자 본인 구독만 CRUD, service_role은 전체 SELECT |
| `reminder_rules` | 소유 구독의 규칙만 CRUD (subscriptions JOIN), service_role 전체 SELECT |
| `notification_logs` | 사용자 본인 로그만 SELECT/DELETE, service_role만 INSERT/SELECT |

---

## 🔑 사용 API 및 외부 서비스

### 1. Resend (이메일 발송)

- **용도**: 구독 갱신 알림 이메일 발송
- **API Endpoint**: `https://api.resend.com/emails`
- **인증**: Bearer Token (`RESEND_API_KEY`)
- **발신자**: `SubReminder <onboarding@resend.dev>`
- **수신자**: 사용자 가입 이메일 (auth.users에서 조회)
- **공식 문서**: https://resend.com/docs

### 2. NotificationAPI (SMS 발송)

- **용도**: 구독 갱신 알림 SMS 발송
- **API Endpoint**: `https://api.notificationapi.com/{CLIENT_ID}/sender`
- **인증**: Basic Auth (`NOTIFICATIONAPI_CLIENT_ID:NOTIFICATIONAPI_CLIENT_SECRET`)
- **수신자**: 프로필 테이블의 `phone_number` (E.164 형식)
- **공식 문서**: https://docs.notificationapi.com

### 3. Supabase (백엔드 인프라)

- **Auth**: 이메일/비밀번호 인증
- **PostgreSQL**: 프로필, 구독, 알림 규칙, 로그 저장
- **Edge Functions**: 알림 발송 로직 실행 (service_role 권한)
- **pg_cron + pg_net**: 매일 09:00 KST 스케줄링

---

## ⚙️ 환경변수 (Secrets)

| 변수명 | 설명 |
|---|---|
| `RESEND_API_KEY` | Resend 이메일 API 키 |
| `NOTIFICATIONAPI_CLIENT_ID` | NotificationAPI 클라이언트 ID |
| `NOTIFICATIONAPI_CLIENT_SECRET` | NotificationAPI 시크릿 키 |
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
    ▼
reminder_rules 테이블에서 enabled=true 인 규칙 조회
(subscriptions INNER JOIN → status='active' 필터)
    │
    ▼
각 규칙별 알림 대상일 계산
(renewal_date - offset_days == today (KST)?)
    │
    ├── 대상 아님 → SKIP
    │
    ├── 대상일 일치 →
    │       │
    │       ▼
    │   notification_logs UNIQUE 제약 확인 (중복 발송 방지)
    │       │
    │       ├── 이미 발송됨 → SKIP (dedup)
    │       │
    │       └── 미발송 →
    │               │
    │               ├── channel=email →
    │               │   profiles에서 user email 조회
    │               │   Resend API로 이메일 발송
    │               │
    │               └── channel=sms →
    │                   profiles에서 phone_number 조회
    │                   NotificationAPI로 SMS 발송
    │
    ▼
notification_logs 테이블에 결과 기록
(sent_date, offset_days 포함)
```

### 알림 규칙 예시

구독 "Netflix" (결제일: 2026-03-01)에 다음 규칙 설정:

| offset_days | channel | 알림 발송일 |
|---|---|---|
| 7 | email | 2026-02-22 |
| 7 | sms | 2026-02-22 |
| 1 | email | 2026-02-28 |
| 0 | email | 2026-03-01 |
| 0 | sms | 2026-03-01 |

### 수동 테스트

```bash
curl -X POST \
  https://mjnkumkzwavirpurfxkj.supabase.co/functions/v1/send-renewal-reminders \
  -H "Authorization: Bearer {ANON_KEY}" \
  -H "Content-Type: application/json"
```

---

## 🖥️ 프론트엔드 페이지 구성

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/auth` | 인증 | 이메일 로그인/회원가입 |
| `/` | 대시보드 | 통계 카드 (활성 구독, 이번 주 갱신, 이메일/SMS 발송 수), 7일 이내 결제 리스트, 최근 알림 로그 |
| `/subscriptions` | 구독 관리 | 구독 추가/삭제, 알림 규칙 편집 (offset × channel) |
| `/logs` | 알림 로그 | 전체 발송 내역 조회 |
| `/settings` | 설정 | 프로필 관리 (이름, 전화번호), 알림 채널 안내 |

---

## 🧩 주요 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `useAuth` (훅) | Supabase Auth 세션 관리, 로그인 상태 |
| `AppLayout` | 사이드바 네비게이션 + 로그아웃 |
| `DashboardStats` | 대시보드 통계 카드 (활성 구독, 갱신 예정, 이메일/SMS 수) |
| `UpcomingRenewals` | 7일 이내 결제 예정 구독 리스트 |
| `SubscriptionList` | 구독 CRUD + 기본 알림 규칙 자동 생성 |
| `ReminderRulesEditor` | 구독별 알림 규칙 관리 (offset_days × channel 토글) |
| `NotificationLogTable` | 알림 발송 로그 테이블 |

---

## 📝 개발 히스토리

### Phase 1: 기본 구조 구축
- React + Vite + TypeScript 프로젝트 생성
- Tailwind CSS + shadcn/ui 디자인 시스템 적용
- 다크 테마 기반 글래스모피즘 UI 구현

### Phase 2: 초기 데이터베이스 설계
- Lovable Cloud(Supabase) 연동
- `subscriptions` 테이블 생성 (단일 notify_days_before, notify_email/sms 플래그)
- `notification_logs` 테이블 생성
- 공개 RLS 정책 설정

### Phase 3: 초기 알림 시스템
- `send-renewal-reminders` Edge Function 개발 (TEST/LIVE 모드)
- Resend API 연동 (이메일), NotificationAPI 연동 (SMS)
- pg_cron 매일 09:00 KST 스케줄링
- 테스트 모드 검증 (force_test_mode, test_email_recipient)

### Phase 4: 인증 및 스키마 리팩토링
- **Supabase Auth** 이메일 로그인/회원가입 구현
- `profiles` 테이블 추가 (phone_number 저장, 가입 시 자동 생성 트리거)
- `subscriptions` 재설계: user_id 추가, service_name/plan_name/billing_cycle/status 필드
- `reminder_rules` 테이블 신규: offset_days × channel 조합으로 유연한 알림 규칙
- `notification_logs` 재설계: user_id, sent_date, offset_days 추가, UNIQUE 중복 방지
- **모든 테이블에 user_id 기반 RLS 정책** 적용

### Phase 5: Edge Function 리팩토링
- TEST_MODE 제거, reminder_rules 기반 발송으로 전환
- 사용자 이메일은 auth.admin.getUserById()로 조회
- SMS 수신번호는 profiles.phone_number에서 조회
- UNIQUE 제약조건 기반 중복 발송 방지 (dedup)

### Phase 6: 프론트엔드 리팩토링
- 인증 페이지 (로그인/회원가입) + ProtectedRoute
- 대시보드에 7일 이내 결제 리스트 (UpcomingRenewals) 추가
- 구독 추가 시 기본 알림 규칙 자동 생성 (7일전/1일전/당일 이메일)
- ReminderRulesEditor: 구독별 알림 규칙 추가/삭제/토글
- 설정 페이지: 프로필 편집 (이름, 전화번호)

---

## 🔒 보안

- **인증 필수**: 모든 페이지는 로그인 필수 (ProtectedRoute)
- **RLS 정책**: 사용자 본인 데이터만 접근 가능 (user_id 기반)
- **서비스 역할 분리**: Edge Function은 service_role 키로 전체 데이터 접근
- **API 키 보호**: 모든 키는 환경변수(Secrets)로 관리
- **중복 방지**: notification_logs UNIQUE 제약조건으로 같은 알림 재발송 차단
- **CORS**: Edge Function에 CORS 헤더 설정

---

## 🚀 배포

- **프론트엔드**: Lovable 자동 배포 (https://sub-alert-pal.lovable.app)
- **Edge Function**: Lovable Cloud 자동 배포
- **데이터베이스**: Lovable Cloud (Supabase PostgreSQL)
- **스케줄러**: pg_cron 매일 09:00 Asia/Seoul
