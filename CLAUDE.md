# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — type-check (`vue-tsc -b`) and build to `dist/`
- `npm run preview` — serve the production build
- `npm run format` — Prettier over the whole repo (single quotes, 140 cols, 2 spaces, `es5` trailing commas)

There is no test runner and no linter configured.

## Stack

Vue 3 (`<script setup>` SFCs) + TypeScript, Vite, Pinia, Vue Router, PrimeVue 4 (unstyled: `theme: 'none'` in `src/main.ts`, styled via Tailwind + `tailwindcss-primeui`, `src/style.css`, `src/assets/tailwind.css`, `src/assets/primevue/`). PrimeVue components are auto-imported via `unplugin-vue-components` (`components.d.ts` is generated) — no manual imports needed in templates. Alias `@` → `src`. UI text and the PrimeVue locale are Polish.

## Architecture

Frontend for the "GoAhead" invoicing/accounting backend (invoices, costs, customers, suppliers, KSeF integration, ZUS DRA).

- **`src/config/http-common.ts`** — the single axios instance. `baseURL` is hardcoded (currently `http://localhost:8077/api`; alternative environments are commented out — check this before committing). Its interceptors are central to app behavior: attach the Bearer token (except `/login`, `/refresh`), on 401 refresh the token and retry the request, on refresh-token expiry log out, on network error/timeout (20 s) redirect to the `Error503` route (backend runs on an EC2 instance that may be off), on 403 redirect to `Error403`.
- **`src/stores/`** — Pinia options-API stores, one per domain (`invoices`, `costs`, `customers`, `suppliers`, `authorization`, ...). All HTTP calls live in store actions, not in views. Stores persist UI prefs (e.g. rows per page) in `localStorage`. `main.ts` injects `router` into every store.
- **`src/router/index.ts`** — routes follow `/goahead/<entity>/all` (list) and `/goahead/<entity>/:isEdit/:<entity>Id` (detail/edit). A `beforeEach` guard redirects to `login` when there's no auth and no refresh token in `localStorage`.
- **`src/views/`** — pairs of `XxxsView` (PrimeVue DataTable list, server-side paging/sorting/filtering via the store) and `XxxView` (form). `src/components/` holds shared pieces plus `invoice/` and `supplier/` dialogs.
- **Async jobs** — long operations (KSeF invoice/cost sync, PDF batch generation, cost document upload, ZUS DRA) are backend jobs: the store starts one, then `src/utils/pollAsyncJob.ts` polls `/goahead/.../jobs/<id>` with backoff until a terminal status (types in `src/types/KsefJob.ts`, `AsyncTask.ts`, `PdfBatchJob.ts`, `CostUpload.ts`, `ZusDra.ts`; helpers in `ksefJobHelpers.ts`, `pdfBatchFailedMaps.ts`).
- **`src/service/FinanceService.ts`** — pure money/VAT calculations (net/gross/VAT per item, `Vat` enum rates) shared by invoices and costs; keep amount math here.
- **EC2 control** — `src/config/ec2.ts`, `composables/useEc2Control.ts`, and `InstanceControl.vue`/`TheHeader.vue` start/stop the backend EC2 instance (also used from `LoginView`).
- **Auth** — JWT via `jwt-decode`; roles (`ROLE_GOAHEAD`, `ROLE_ADMIN`) are read from token `authorities` in the `authorization` store getters.
- **File download** — `src/utils/pdfFileDownload.ts` (file-name sanitizing and download of PDFs/blobs).