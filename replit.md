# Sencillo - Personal Finance App

## Overview

Sencillo is a personal finance management mobile application built with Expo (React Native) and an Express backend. Originally migrated from a web app, it helps users track income, expenses, savings, and budgets with multi-currency support (USD, VES, EUR) and Venezuelan exchange rate tracking (BCV/parallel rates). The app features a P&L (Profit & Loss) structure with four financial segments: ingresos (income), gastos fijos (fixed expenses), gastos variables (variable expenses), and ahorro (savings).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, TypeScript strict mode enabled
- **Navigation**: expo-router with file-based routing. Uses a tab layout (`app/(tabs)/`) with five tabs: Home (index), History, Add (placeholder that opens modal), Budget, and Settings. Modal screens for transaction entry, categories management, and reports are defined at the `app/` root level
- **State Management**: React Context (`lib/context/AppContext.tsx`) manages all app state including transactions, exchange rates, P&L structure, budgets, view modes, and dashboard computed data. This was chosen over Zustand for simplicity given the app's scope
- **Data Persistence**: Repository pattern (`lib/repositories/`) with AsyncStorage backend. Each domain entity has its own repository (TransactionRepository, ProfileRepository, RatesRepository, PnlRepository, BudgetRepository, SavingsRepository, AuthRepository). The old `lib/data/storage.ts` is preserved but no longer imported — all data access goes through repositories. Storage keys are prefixed with `@sencillo/`. IDs are generated with `Crypto.randomUUID()`. This architecture is designed for easy migration to Supabase or other backends
- **Authentication**: AuthContext delegates all persistence to AuthRepository. Passwords are hashed before storage (basic hash, ready for upgrade to bcrypt/Supabase Auth). Session management (login, register, logout) flows through AuthRepository exclusively — AuthContext has zero AsyncStorage imports
- **Styling**: Pure `StyleSheet` (no NativeWind despite the migration prompt mentioning it). Uses a centralized color constants file (`constants/colors.ts`) with a dark theme as primary
- **Fonts**: Outfit font family (400-900 weights) via `@expo-google-fonts/outfit`
- **Key UI Libraries**: expo-blur, expo-linear-gradient, expo-haptics, react-native-gesture-handler, react-native-reanimated, react-native-keyboard-controller

### Backend (Express)

- **Server**: Express 5 running on Node.js (`server/index.ts`)
- **Purpose**: Currently minimal — serves as API proxy and static file server. Routes are registered in `server/routes.ts` but no application routes are defined yet
- **Storage**: In-memory storage (`server/storage.ts`) with a `MemStorage` class implementing `IStorage` interface for users. This is a placeholder — the app currently stores all financial data client-side via AsyncStorage
- **CORS**: Configured to allow Replit dev/deployment domains and localhost origins for Expo web development
- **Static Serving**: In production, serves built Expo web assets; in development, proxies to Metro bundler

### Database Schema (Drizzle + PostgreSQL)

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Currently only has a `users` table (`shared/schema.ts`) with id (UUID), username, and password fields
- **Validation**: drizzle-zod generates Zod schemas from Drizzle table definitions
- **Migrations**: Output to `./migrations` directory via drizzle-kit
- **Note**: The database is provisioned but largely unused — all financial data lives in AsyncStorage on the client. Future work would likely move transactions, budgets, and P&L structures to PostgreSQL

### Domain Logic (`lib/domain/`)

- **`types.ts`**: Core type definitions — Segment, Transaction, Currency, RateType, Rates, PnlStructure, Budgets, DashboardData, BudgetSummary, ViewMode, Granularity, RecurrenceType
- **`finance.ts`**: Pure financial functions including currency conversion (VES/EUR to USD via exchange rates), rate computation, dashboard aggregation, budget computation, P&L report generation, recurrence generation, and formatting utilities
- **Currency Model**: Three currencies supported (VES, USD, EUR). All amounts are converted to USD for aggregation. VES conversion uses BCV or parallel rates. EUR converts through VES (EUR→Bs→USD)
- **Exchange Rates**: Four rate types tracked — BCV, parallel, EUR, and EUR cross rate. Rates are fetched externally and cached with timestamps

### Build & Deployment

- **Development**: Two processes — `expo:dev` for Metro bundler and `server:dev` for Express backend (via tsx)
- **Production Build**: Custom build script (`scripts/build.js`) that starts Metro, bundles the web app, then serves via Express. Server is bundled with esbuild
- **Database**: `db:push` script uses drizzle-kit to push schema changes

## External Dependencies

- **PostgreSQL**: Connected via `DATABASE_URL` environment variable, used with Drizzle ORM. Currently only stores user data
- **Exchange Rate API**: The app fetches Venezuelan exchange rates (BCV, parallel, EUR) from an external source (implementation in `fetchRates` in `lib/domain/finance.ts`)
- **AsyncStorage**: `@react-native-async-storage/async-storage` for client-side persistence of all financial data
- **TanStack React Query**: Set up for server state management (`lib/query-client.ts`) with API request utilities, though not heavily used yet since data is primarily local
- **Expo Services**: Various Expo modules for device capabilities — haptics, image picker, location, crypto (UUID generation), blur effects
- **dayjs**: Date manipulation library used throughout for timezone-safe date handling
- **Zod**: Schema validation, integrated with Drizzle via drizzle-zod