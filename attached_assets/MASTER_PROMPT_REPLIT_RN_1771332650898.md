# MASTER PROMPT — Migrar Sencillo Web a App Mobile (React Native + NativeWind)

Quiero que actúes como **arquitecto + implementador senior de React Native** y construyas una app mobile productiva basada en mi webapp **Sencillo**.

## Contexto obligatorio (sí, incluir código actual)
Para evitar pérdida de lógica, **te voy a compartir el código actual de la webapp** y debes usarlo como fuente de verdad.

1. Toma como baseline el archivo actual: `index.html` (Sencillo web).
2. Extrae de allí reglas de negocio, cálculos, estructuras de datos y flujos.
3. Si alguna regla en este prompt difiere del código, **prioriza reproducir el comportamiento real del código** y documenta la diferencia.

> Instrucción para Replit: antes de programar, crea un documento `docs/web-baseline.md` con un resumen estructurado de la lógica encontrada en `index.html` (tasas, conversiones, KPIs, budget, P&L, recurrencias, Firestore).

## Objetivo principal (no negociable)
- Migrar la app a React Native (Expo) usando `StyleSheet` + `NativeWind`.
- **Preservar 100% la lógica financiera actual** (cálculos, conversiones, acumulados, filtros, reportes y presupuesto).
- Mejorar estructura de código, mantenibilidad y experiencia mobile, sin alterar resultados numéricos.

## Stack y lineamientos técnicos
- Framework: **Expo + React Native + TypeScript**.
- UI: `NativeWind` para utilidades visuales + `StyleSheet` para tokens/estilos reutilizables.
- Navegación: `@react-navigation/native` con tabs + stacks.
- Estado:
  - Server/data sync: Firebase Auth + Firestore.
  - Estado local: Zustand o Context + reducers (elige una opción y justifícala).
- Fechas: dayjs/luxon para evitar bugs de zona horaria.
- Validación: zod.
- Formularios: react-hook-form.
- Testing:
  - Unit tests para lógica financiera pura.
  - Integration tests para flujos críticos.
- Calidad: ESLint + Prettier + TypeScript strict.

## Regla de oro sobre lógica financiera
Debes extraer la lógica financiera a funciones puras (`src/domain/finance/*`) y **probar paridad** contra reglas actuales:

### Segmentos y tipos
- `ingresos` => `income`
- `ahorro` => `expense`
- `gastos_fijos` => `expense`
- `gastos_variables` => `expense`

### Categorías P&L por defecto
```ts
const DEFAULT_PNL = {
  ingresos: ["Sueldo", "Honorarios", "Ventas"],
  gastos_fijos: ["Alquiler", "Internet", "Condominio", "Colegio", "Suscripciones"],
  gastos_variables: ["Mercado", "Salidas", "Salud", "Transporte", "Gustos"],
  ahorro: ["Ahorro General"]
}
```

### Monedas y conversión a USD de reporte
- Si moneda es USD: `amountUSD = amount`
- Si moneda es VES: `amountUSD = amount / tasaSeleccionada`
  - tasa seleccionada: BCV, paralelo (USDC) o manual.
- Si moneda es EUR:
  - `amountInBs = amount * tasaEURenBs` (manual o BCV-EUR)
  - `amountUSD = amountInBs / tasaBCV`

### Fuentes de tasas
Implementa fetch resiliente y fallback:
1. `https://ve.dolarapi.com/v1/cotizaciones`
2. `https://ve.dolarapi.com/v1/dolares/paralelo`
3. `https://open.er-api.com/v6/latest/USD`

Campos esperados de tasas:
```ts
type Rates = { bcv: number; parallel: number; eur: number; eurCross: number }
```

### Reglas de transacciones
Cada transacción debe tener mínimo:
```ts
{
  id?: string
  type: 'income' | 'expense'
  segment: 'ingresos' | 'ahorro' | 'gastos_fijos' | 'gastos_variables'
  amount: number
  currency: 'VES' | 'USD' | 'EUR'
  originalRate: number
  amountUSD: number
  category: string
  description?: string
  date: string // ISO
  profileId: 'personal'
}
```

### Recurrencia (al crear movimiento)
Soporta:
- none
- weekly (+7 días)
- monthly (+1 mes)
- quarterly (+3 meses)
- quadrimester (+4 meses)
- biannual (+6 meses)

Genera recurrencias hasta final del año actual (con safety counter para evitar loops infinitos).

### Dashboard (Home) — cálculos exactos
Para rango de vista `month`, `ytd`, `year`:
- Acumular: ingresos, gastos, gastos fijos, gastos variables, ahorro, balance.
- Mantener desglose por origen monetario:
  - VES “nominal” (monto original en Bs)
  - Hard currency (USD + EUR expresado en USD)
- Balance:
  - Si transacción `type=income`, suma.
  - Si `expense`, resta.

### Budget view — lógica exacta
Para el mes actual:
- `variableTotal` = suma de `gastos_variables` en USD.
- `income` = suma de `ingresos` en USD.
- `savings` = suma de `ahorro` en USD.
- `fixed` = suma de `gastos_fijos` en USD.
- `realAvailable = (income - savings) - fixed`
- `totalBudget = sum(budgets[category])`
- `progress = variableTotal / totalBudget * 100` (si totalBudget > 0, si no 0)

### Reporte P&L (tabla)
- Agrupación: daily, weekly, monthly, yearly.
- Segmentos: ingresos, ahorro, gastos_fijos, gastos_variables.
- Crear llaves dinámicas por concepto + moneda: `"{category} ({Bs|USD|EUR})"`.
- Para `ahorro` en VES, en reporte convertir con BCV vigente (`amount / rates.bcv`) para consistencia de lectura.
- Métricas por período:
  - `available = ingresos - ahorro`
  - `flexibleAvailable = ingresos - ahorro - gastos_fijos`
  - `net = ingresos - ahorro - gastos_fijos - gastos_variables`

## Firestore (estructura requerida)
Mantén esta estructura:
- `projects/{PROJECT_DOC_ID}/users/{uid}/settings/rates`
- `projects/{PROJECT_DOC_ID}/users/{uid}/settings/pnl`
- `projects/{PROJECT_DOC_ID}/users/{uid}/settings/budgets`
- `projects/{PROJECT_DOC_ID}/users/{uid}/transactions/{transactionId}`

Usa listeners realtime (`onSnapshot`) para settings y transacciones.
Ordena historial por fecha desc.

## Pantallas mínimas a construir
1. Login/Auth (email/password + Google si aplica en Expo).
2. Home Dashboard (KPIs + selector de período).
3. Modal de Nuevo/Editar movimiento.
4. Historial con filtros por segmento y mes.
5. Presupuestos (por categoría variable + barra de progreso).
6. Personalización (CRUD de categorías por segmento).
7. Reporte P&L (tabla navegable y legible en mobile).
8. Perfil (logout, reset password, acciones seguras).

## UX/UI mobile
- Mantén estética premium oscura inspirada en Sencillo.
- Cuidar safe areas, teclado, formularios largos y rendimiento en listas.
- Componentes reutilizables (`Button`, `MoneyInput`, `RateSelector`, `KpiCard`, etc.).
- Loading, empty states, errores y confirmaciones claras.

## Entregables obligatorios
1. App corriendo en Expo.
2. Código modular por capas:
   - `src/domain` (lógica pura)
   - `src/data` (firebase/repos)
   - `src/features/*`
   - `src/ui/*`
3. Tests de paridad financiera (crítico).
4. README con setup y decisiones técnicas.
5. Checklist de paridad (web vs mobile) con evidencia.

## Criterio de aceptación
No se considera terminado hasta que:
- Los mismos datos de entrada produzcan **los mismos resultados numéricos** que la web.
- Las vistas clave (Home, Budget, Reporte, Historial) estén funcionales.
- Existan tests que cubran conversiones, KPIs, budget, P&L y recurrencias.

## Forma de trabajo que te pido
1. Primero propón arquitectura y árbol de carpetas.
2. Luego implementa por fases pequeñas, mostrando diffs clave.
3. Después agrega tests de paridad.
4. Finalmente entrega guía para correr en Replit + Expo Go.

Cuando haya ambigüedad, prioriza siempre **preservar lógica financiera existente** sobre cambios cosméticos.

```txt
=== INICIO CODIGO WEB SENCILLO (BASELINE) ===
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Sencillo v2.0</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        dark: {
                            base: '#020617',    // Slate 950
                            surface: '#0f172a', // Slate 900
                            card: '#1e293b',    // Slate 800
                            highlight: '#334155', // Slate 700
                        },
                        brand: {
                            light: '#34d399', // Emerald 400
                            DEFAULT: '#10b981', // Emerald 500
                            dark: '#047857',   // Emerald 700
                            glow: 'rgba(16, 185, 129, 0.5)' // Sombra Neon
                        }
                    },
                    fontFamily: {
                        sans: ['Outfit', 'sans-serif'],
                    },
                    boxShadow: {
                        'neon': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
                        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                        'danger': '0 0 20px -5px rgba(239, 68, 68, 0.3)',
                    },
                    backgroundImage: {
                        'card-gradient': 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                        'app-bg': 'radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 40%)',
                        'bar-gradient': 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                        'danger-gradient': 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(153, 27, 27, 0.1) 100%)',
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.3s ease-out',
                        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    },
                    keyframes: {
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' },
                        },
                        slideUp: {
                            '0%': { transform: 'translateY(100%)' },
                            '100%': { transform: 'translateY(0)' },
                        },
                        bounceIn: {
                            '0%': { transform: 'scale(0)' },
                            '100%': { transform: 'scale(1)' }
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- React & ReactDOM -->
    <script type="importmap">
        {
            "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "lucide-react": "https://esm.sh/lucide-react@0.263.1"
            }
        }
    </script>
    
    <!-- Fuente Outfit -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        body { 
            -webkit-tap-highlight-color: transparent; 
            overscroll-behavior-y: none; 
            font-family: 'Outfit', sans-serif; 
            background-color: #020617; 
            color: #ffffff;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        
        .safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom) + 25px); }
        
        /* === ESTILOS PREMIUM === */
        .glass-panel-premium {
            background: rgba(15, 23, 42, 0.7); 
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .glass-input {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            transition: all 0.2s ease;
        }
        .glass-input:focus {
            background: rgba(0, 0, 0, 0.4);
            border-color: #10b981;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        /* Estilo más plano para KPIs para que no parezcan botones */
        .surface-panel {
            background: #0f172a; /* Slate 900 */
            border: 1px solid rgba(255, 255, 255, 0.05);
            /* Sin sombra elevadora para que se vea plano */
        }

        .btn-press { transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-press:active { transform: scale(0.96); }

        /* Estilos P&L */
        .pnl-table-container { overflow-x: auto; position: relative; }
        .pnl-table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 0.85rem; }
        .pnl-cell { padding: 14px 16px; white-space: nowrap; border-bottom: 1px solid #1e293b; color: #94a3b8; text-align: right; }
        .pnl-cell-head { font-weight: 600; background-color: #020617; color: #34d399; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.7rem; position: sticky; top: 0; z-index: 10; text-align: center; border-bottom: 1px solid #334155; }
        .pnl-col-sticky { position: sticky; left: 0; background-color: #020617; z-index: 20; border-right: 1px solid #1e293b; text-align: left; min-width: 140px; }
        .pnl-row-group-header { background-color: #0f172a; font-weight: 700; color: #FFFFFF; }
        .pnl-row-total { background-color: #1e293b; font-weight: 700; color: #34d399; }
        .pnl-row-net { background-color: #0f172a; font-weight: 800; color: #10B981; border-top: 1px solid #333; }
        .pnl-row-available { background-color: #0f172a; font-weight: 800; color: #3B82F6; border-top: 1px solid #333; }
        .pnl-row-flexible { background-color: #1e293b; font-weight: 800; color: #a855f7; border-top: 1px solid #333; border-bottom: 1px solid #333; }

        ::-webkit-calendar-picker-indicator { filter: invert(1); }
        
        .zoom-controls {
            position: fixed;
            bottom: 40px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 60;
        }
        
        .fab-shadow {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
    </style>
</head>
<body class="bg-app-bg text-white overflow-hidden h-full">
    <div id="root" class="h-full"></div>

    <script type="module">
        import React, { useState, useEffect, useMemo, Component, useRef } from 'react';
        import { createRoot } from 'react-dom/client';
        import { 
            Wallet, TrendingUp, TrendingDown, Plus, Settings, 
            Calendar, DollarSign, RefreshCw, X, Save, ArrowRightLeft,
            LogOut, ChevronDown, Home, History, PieChart, Trash2, List, FileSpreadsheet,
            Users, User, Check, Repeat, Pencil, Loader2, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, PiggyBank, Mail, Lock, Search, AlertCircle, ShieldCheck, Bug, Database, Terminal, Receipt, CreditCard, Info, Maximize2, Minimize2, ZoomIn, ZoomOut, MapPin, Phone, HelpCircle, AlertTriangle, Euro, FileText, BarChart3, CalendarRange, Globe, AlertOctagon,
            ArrowRight
        } from 'lucide-react';

        // --- FIREBASE SETUP ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithPopup, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getFirestore, initializeFirestore, memoryLocalCache, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, orderBy, limit, addDoc, deleteDoc, updateDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

        const ROOT_COLLECTION = 'projects';
        const PROJECT_DOC_ID = 'sencillo-app-40a36';
        
        const FIREBASE_CONFIG = {
            apiKey: "AIzaSyCAd_vju_x9wuhGtZJvvoWpt9JbRUwB63k",
            authDomain: "sencillo-app-40a36.firebaseapp.com",
            databaseURL: "https://sencillo-app-40a36-default-rtdb.firebaseio.com",
            projectId: "sencillo-app-40a36",
            storageBucket: "sencillo-app-40a36.firebasestorage.app",
            messagingSenderId: "27193285455",
            appId: "1:27193285455:web:6cb0f8ac14f0e36fb0433a"
        };

        // --- ERROR BOUNDARY ---
        class ErrorBoundary extends Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false };
            }
            static getDerivedStateFromError(error) { return { hasError: true }; }
            componentDidCatch(error, errorInfo) { console.error("Error:", error, errorInfo); }
            render() {
                if (this.state.hasError) return React.createElement('div', { className: "h-screen flex flex-col items-center justify-center p-6 text-center" }, React.createElement('h2', null, "Algo salió mal"), React.createElement('button', { onClick: () => window.location.reload(), className: "mt-4 bg-white text-black px-4 py-2 rounded" }, "Recargar"));
                return this.props.children;
            }
        }

        let app, auth, db;
        try {
            app = initializeApp(FIREBASE_CONFIG);
            auth = getAuth(app);
            try { db = initializeFirestore(app, { localCache: memoryLocalCache() }, PROJECT_DOC_ID); } catch (e) { db = getFirestore(app); }
        } catch (error) { console.error("Firebase init error:", error); }

        // --- CONSTANTES ---
        const DEFAULT_PNL = {
            ingresos: ["Sueldo", "Honorarios", "Ventas"],
            gastos_fijos: ["Alquiler", "Internet", "Condominio", "Colegio", "Suscripciones"],
            gastos_variables: ["Mercado", "Salidas", "Salud", "Transporte", "Gustos"],
            ahorro: ["Ahorro General"]
        };

        const SEGMENTS = {
            ingresos: { label: "Ingresos", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/20", type: "income" },
            ahorro: { label: "Ahorro", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-500/20", type: "expense" },
            gastos_fijos: { label: "Gastos Fijos", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-500/20", type: "expense" },
            gastos_variables: { label: "Gastos Variables", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-500/20", type: "expense" }
        };

        const RECURRENCE_OPTIONS = [
            { id: 'none', label: 'No repetir' },
            { id: 'weekly', label: 'Semanalmente' },
            { id: 'monthly', label: 'Mensualmente' },
            { id: 'quarterly', label: 'Trimestral (c/3 meses)' },
            { id: 'quadrimester', label: 'Cuatrimestral (c/4 meses)' },
            { id: 'biannual', label: 'Semestral (c/6 meses)' }
        ];

        // --- FUNCION DE TASAS ---
        const getRatesFromAPI = async () => {
            try {
                const [cotizacionesRes, parallelRes, globalRes] = await Promise.all([
                    fetch('https://ve.dolarapi.com/v1/cotizaciones').catch(() => null),
                    fetch('https://ve.dolarapi.com/v1/dolares/paralelo').catch(() => null),
                    fetch('https://open.er-api.com/v6/latest/USD').catch(() => null)
                ]);
                
                const newRates = { bcv: 0, parallel: 0, eur: 0, eurCross: 0 };
                let bcvRate = 0;
                
                if (cotizacionesRes && cotizacionesRes.ok) { 
                    const data = await cotizacionesRes.json();
                    const usd = data.find(item => item.moneda === 'USD');
                    if (usd && usd.promedio) {
                        bcvRate = parseFloat(usd.promedio);
                        newRates.bcv = bcvRate;
                    }
                }
                
                if (parallelRes && parallelRes.ok) { 
                    const d = await parallelRes.json(); 
                    if (d.promedio) newRates.parallel = parseFloat(d.promedio); 
                }
                
                if (bcvRate > 0 && globalRes && globalRes.ok) {
                    const globalData = await globalRes.json();
                    const usdToEur = globalData.rates.EUR; 
                    
                    if (usdToEur) {
                        const eurToUsd = 1 / usdToEur;
                        const bcvEur = bcvRate * eurToUsd;
                        newRates.eur = parseFloat(bcvEur.toFixed(4));
                        newRates.eurCross = parseFloat(eurToUsd.toFixed(4)); 
                    }
                } else if (bcvRate > 0) {
                     if (cotizacionesRes && cotizacionesRes.ok) {
                         const data = await cotizacionesRes.json();
                         const eur = data.find(item => item.moneda === 'EUR');
                         if (eur && eur.promedio) newRates.eur = parseFloat(eur.promedio);
                     }
                }
                return newRates;
            } catch (e) { console.error("Error al obtener tasas:", e); return null; }
        };
        
        const getLocalDateString = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // --- UI COMPONENTS ---
        const Button = ({ children, onClick, variant = 'primary', className = '', type="button", disabled = false }) => {
            const variants = {
                primary: "btn-press bg-card-gradient text-white shadow-neon font-bold border border-white/10", 
                secondary: "btn-press bg-dark-highlight text-white border border-white/10 hover:bg-white/10",
                ghost: "text-gray-400 hover:text-white",
                destructive: "btn-press bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
            };
            return React.createElement('button', { onClick, type, disabled, className: `px-6 py-4 rounded-2xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 w-full ${variants[variant]} ${className} ${disabled ? 'opacity-50' : ''}` }, children);
        };

        const AutoSaveStatus = ({ status }) => {
            return React.createElement('div', { 
                className: `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none transition-all duration-500 ease-out ${status === 'idle' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}` 
            },
                React.createElement('div', { className: "bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center justify-center" },
                    status === 'saving' 
                        ? React.createElement(Loader2, { size: 32, className: "animate-spin text-brand" }) 
                        : React.createElement(Check, { size: 32, className: "text-emerald-400 animate-bounce-in" })
                )
            );
        };

        // --- INTRO MODAL COMPONENT ---
        const IntroModal = ({ onClose }) => {
            const [dontShow, setDontShow] = useState(false);

            return React.createElement('div', { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fade-in" },
                 React.createElement('div', { className: "bg-dark-card p-6 rounded-[2rem] border border-white/10 max-w-sm w-full animate-bounce-in shadow-glass" },
                    
                    React.createElement('div', { className: "space-y-5 mb-6 mt-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar" },
                        React.createElement('div', { className: "flex gap-4 items-start" },
                            React.createElement('div', { className: "w-10 h-10 rounded-2xl bg-dark-surface border border-white/10 flex items-center justify-center text-gray-400 shrink-0 shadow-sm" }, 
                                React.createElement(Settings, { size: 20 })
                            ),
                            React.createElement('div', { className: "pt-1" },
                                React.createElement('strong', { className: "block text-white text-sm mb-1" }, "1. Personalización"),
                                React.createElement('p', { className: "text-gray-400 text-xs leading-relaxed" }, "Configura tus categorías de ingresos, gastos fijos y variables para adaptar la app a ti.")
                            )
                        ),
                        React.createElement('div', { className: "flex gap-4 items-start" },
                            React.createElement('div', { className: "w-10 h-10 rounded-full bg-brand text-black flex items-center justify-center shrink-0 shadow-neon" }, 
                                React.createElement(Plus, { size: 24, strokeWidth: 3 })
                            ),
                            React.createElement('div', { className: "pt-1" },
                                React.createElement('strong', { className: "block text-white text-sm mb-1" }, "2. Agregar Movimientos"),
                                React.createElement('p', { className: "text-gray-400 text-xs leading-relaxed" }, "Registra ingresos o gastos usando el botón central. Puedes usar Bs, USD o EUR.")
                            )
                        ),
                        React.createElement('div', { className: "flex gap-4 items-start" },
                            React.createElement('div', { className: "w-10 h-10 rounded-2xl bg-dark-surface border border-white/10 flex items-center justify-center text-gray-400 shrink-0 shadow-sm" }, 
                                React.createElement(PieChart, { size: 20 })
                            ),
                            React.createElement('div', { className: "pt-1" },
                                React.createElement('strong', { className: "block text-white text-sm mb-1" }, "3. Presupuestos"),
                                React.createElement('p', { className: "text-gray-400 text-xs leading-relaxed" }, "Define límites para tus Gastos Variables y mantén siempre positivo tu Disponible Flexible.")
                            )
                        ),
                        React.createElement('div', { className: "flex gap-4 items-start" },
                            React.createElement('div', { className: "w-10 h-10 rounded-2xl bg-dark-surface border border-white/10 flex items-center justify-center text-gray-400 shrink-0 shadow-sm" }, 
                                React.createElement(FileSpreadsheet, { size: 20 })
                            ),
                            React.createElement('div', { className: "pt-1" },
                                React.createElement('strong', { className: "block text-white text-sm mb-1" }, "4. Reportes"),
                                React.createElement('p', { className: "text-gray-400 text-xs leading-relaxed" }, "Analiza tus finanzas con tablas detalladas y proyecciones de tu rendimiento.")
                            )
                        )
                    ),

                    React.createElement('div', { onClick: () => setDontShow(!dontShow), className: "flex items-center gap-3 mb-6 cursor-pointer p-3 -mx-2 rounded-xl hover:bg-white/5 transition-colors group" },
                        React.createElement('div', { className: `w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${dontShow ? 'bg-brand border-brand' : 'border-gray-500 bg-transparent group-hover:border-gray-300'}` },
                            dontShow && React.createElement(Check, { size: 14, className: "text-black", strokeWidth: 3 })
                        ),
                        React.createElement('span', { className: "text-xs font-bold text-gray-400 select-none group-hover:text-gray-200 transition-colors" }, "No mostrar más este mensaje")
                    ),

                    React.createElement('button', { 
                        onClick: () => onClose(dontShow),
                        className: "w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors btn-press shadow-lg"
                    }, "Entendido")
                 )
            );
        };

        // --- PANTALLAS ---
        const LoginScreen = () => {
            const [isSignUp, setIsSignUp] = useState(false);
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [loading, setLoading] = useState(false);
            const [errorMsg, setErrorMsg] = useState(null);
            
            const handleSubmit = async (e) => {
                e.preventDefault(); setLoading(true); setErrorMsg(null);
                if (!email || !password) { setErrorMsg("Faltan datos"); setLoading(false); return; }
                try {
                    isSignUp ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
                } catch (error) { setLoading(false); setErrorMsg(error.message); }
            };

            const handleGoogleLogin = async () => {
                try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setErrorMsg("Error Google Auth"); }
            };
            
            return React.createElement('div', { className: "min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-app-bg text-white" },
                React.createElement('div', { className: "w-full max-w-sm py-12" },
                    React.createElement('div', { className: "text-center mb-8" },
                        React.createElement('div', { className: "w-24 h-24 bg-card-gradient rounded-3xl rotate-3 flex items-center justify-center mx-auto mb-6 shadow-neon text-white" }, React.createElement(Wallet, { size: 48 })),
                        React.createElement('h1', { className: "text-4xl font-black mb-2 tracking-tight" }, "Sencillo"),
                        React.createElement('p', { className: "text-gray-400 text-lg font-light" }, "Tus cuentas claras")
                    ),
                    errorMsg && React.createElement('div', { className: "mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-2" }, React.createElement(AlertCircle, { size: 16 }), errorMsg),
                    React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-xs font-bold text-gray-500 ml-1 uppercase" }, "Email"),
                             React.createElement('input', { type: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full px-4 py-3 bg-dark-surface border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand glass-input", placeholder: "hola@ejemplo.com" })
                        ),
                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-xs font-bold text-gray-500 ml-1 uppercase" }, "Contraseña"),
                             React.createElement('input', { type: "password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full px-4 py-3 bg-dark-surface border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand glass-input", placeholder: "••••••••" })
                        ),
                        React.createElement(Button, { type: "submit", disabled: loading, className: "mt-6" }, loading ? React.createElement(Loader2, { className: "animate-spin" }) : (isSignUp ? "Registrarse" : "Entrar")),
                        
                        React.createElement('button', { type: "button", onClick: handleGoogleLogin, className: "w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors mt-4 btn-press" },
                            React.createElement('svg', { className: "w-5 h-5", viewBox: "0 0 24 24" },
                                React.createElement('path', { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z", fill: "#4285F4" }),
                                React.createElement('path', { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }),
                                React.createElement('path', { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z", fill: "#FBBC05" }),
                                React.createElement('path', { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })
                            ),
                            "Continuar con Google"
                        ),
                        
                        React.createElement('div', { className: "mt-6 text-center" },
                            React.createElement('button', { type: "button", onClick: () => { setIsSignUp(!isSignUp); setErrorMsg(null); }, className: "text-sm text-gray-400 hover:text-brand transition-colors p-2" }, isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate")
                        )
                    )
                )
            );
        };

        // --- PROFILE VIEW ---
        const ProfileView = ({ user, onBack, onLogout }) => {
            const [profileData, setProfileData] = useState({
                firstName: user.displayName ? user.displayName.split(' ')[0] : '',
                surname: user.displayName && user.displayName.split(' ').length > 1 ? user.displayName.split(' ').slice(1).join(' ') : '',
                phone: '',
                address: '',
                idNumber: '',
                email: user.email || '',
                receivePromotions: true
            });
            const [isSaving, setIsSaving] = useState(false);
            const [msg, setMsg] = useState(null);

            useEffect(() => {
                const fetchProfile = async () => {
                    try {
                        const docRef = doc(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid, 'settings', 'profile');
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            setProfileData(prev => ({ ...prev, ...docSnap.data() }));
                        }
                    } catch (err) { console.error("Error fetching profile", err); }
                };
                fetchProfile();
            }, [user]);

            const handleSave = async () => {
                setIsSaving(true);
                setMsg(null);
                try {
                    const fullName = `${profileData.firstName} ${profileData.surname}`.trim();
                    if (auth.currentUser.displayName !== fullName) {
                        await updateProfile(auth.currentUser, { displayName: fullName });
                    }
                    const docRef = doc(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid, 'settings', 'profile');
                    await setDoc(docRef, profileData, { merge: true });
                    
                    setMsg({ type: 'success', text: 'Perfil actualizado' });
                    setTimeout(() => setMsg(null), 3000);
                } catch (err) {
                    setMsg({ type: 'error', text: 'Error al guardar: ' + err.message });
                } finally {
                    setIsSaving(false);
                }
            };

            const handleResetTransactions = async () => {
                if(!confirm("⚠️ ZONA DE PELIGRO\n\n¿Estás 100% seguro de eliminar TODOS tus movimientos y empezar de cero?\n\nEsta acción NO se puede deshacer.")) return;
                if(!confirm("Confirma nuevamente: Se borrará todo tu historial de ingresos y gastos permanentemente.")) return;
                
                setIsSaving(true);
                try {
                    const q = query(collection(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid, 'transactions'));
                    const snapshot = await getDocs(q);
                    
                    const batch = writeBatch(db);
                    snapshot.docs.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    
                    await batch.commit();
                    setMsg({ type: 'success', text: 'Historial eliminado correctamente' });
                    setTimeout(() => setMsg(null), 3000);
                } catch (e) {
                    setMsg({ type: 'error', text: 'Error al eliminar: ' + e.message });
                } finally {
                    setIsSaving(false);
                }
            };

            const handleDeleteAccount = async () => {
                if (confirm("¿Estás seguro de eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus datos.")) {
                    try {
                        await deleteUser(auth.currentUser);
                    } catch (e) { alert("Error: " + e.message); }
                }
            };

            const handlePasswordReset = async () => {
                if (!user.email) return;
                try {
                    await sendPasswordResetEmail(auth, user.email);
                    alert(`Correo de restablecimiento enviado a ${user.email}`);
                } catch (e) { alert("Error: " + e.message); }
            };

            const handleChange = (field, value) => {
                setProfileData(prev => ({ ...prev, [field]: value }));
            };

            return React.createElement('div', { className: "h-full flex flex-col pt-[env(safe-area-inset-top)] bg-app-bg animate-slide-up" },
                React.createElement('div', { className: "flex justify-between items-center px-6 py-4" },
                    React.createElement('button', { onClick: onBack, className: "p-2 -ml-2 text-gray-400 hover:text-white" }, React.createElement(ChevronLeft, { size: 28 })),
                    React.createElement('h2', { className: "text-lg font-bold text-white" }, "Mi Perfil"),
                    React.createElement('button', { onClick: handleSave, disabled: isSaving, className: "text-brand font-bold text-sm" }, isSaving ? React.createElement(Loader2, { className: "animate-spin" }) : "Guardar")
                ),

                React.createElement('div', { className: "flex-1 overflow-y-auto px-6 pb-12 space-y-6" },
                    
                    msg && React.createElement('div', { className: `p-3 rounded-xl text-sm font-bold text-center ${msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}` }, msg.text),
                    
                    React.createElement('div', { className: "glass-panel-premium p-6 rounded-[2rem] space-y-5" },
                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Nombre"),
                             React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-4" },
                                React.createElement(User, { size: 16, className: "text-gray-500 mr-3" }),
                                React.createElement('input', { 
                                    value: profileData.firstName, 
                                    onChange: (e) => handleChange('firstName', e.target.value), 
                                    className: "w-full py-4 bg-transparent text-white font-medium focus:outline-none placeholder-gray-600", 
                                    placeholder: "Tu nombre" 
                                })
                             )
                        ),
                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Apellido"),
                             React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-4" },
                                React.createElement('div', { className: "w-4 mr-3" }), 
                                React.createElement('input', { 
                                    value: profileData.surname, 
                                    onChange: (e) => handleChange('surname', e.target.value), 
                                    className: "w-full py-4 bg-transparent text-white font-medium focus:outline-none placeholder-gray-600", 
                                    placeholder: "Tu apellido" 
                                })
                             )
                        ),
                        
                        React.createElement('div', { className: "grid grid-cols-3 gap-3" },
                            React.createElement('div', { className: "col-span-1 space-y-1" },
                                React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Prefijo"),
                                React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-3 py-4 justify-center gap-2" },
                                    React.createElement('span', { className: "text-lg" }, "🇻🇪"),
                                    React.createElement('span', { className: "text-white font-bold" }, "+58")
                                )
                            ),
                            React.createElement('div', { className: "col-span-2 space-y-1" },
                                React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Móvil"),
                                React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-4" },
                                    React.createElement(Phone, { size: 16, className: "text-gray-500 mr-3" }),
                                    React.createElement('input', { 
                                        type: "tel",
                                        value: profileData.phone, 
                                        onChange: (e) => handleChange('phone', e.target.value), 
                                        className: "w-full py-4 bg-transparent text-white font-medium focus:outline-none placeholder-gray-600", 
                                        placeholder: "414 1234567" 
                                    })
                                )
                            )
                        ),

                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Dirección"),
                             React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-4" },
                                React.createElement(MapPin, { size: 16, className: "text-gray-500 mr-3" }),
                                React.createElement('input', { 
                                    value: profileData.address, 
                                    onChange: (e) => handleChange('address', e.target.value), 
                                    className: "w-full py-4 bg-transparent text-white font-medium focus:outline-none placeholder-gray-600", 
                                    placeholder: "Caracas, Venezuela" 
                                })
                             )
                        ),

                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Cédula / ID"),
                             React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-4" },
                                React.createElement(CreditCard, { size: 16, className: "text-gray-500 mr-3" }),
                                React.createElement('input', { 
                                    value: profileData.idNumber, 
                                    onChange: (e) => handleChange('idNumber', e.target.value), 
                                    className: "w-full py-4 bg-transparent text-white font-medium focus:outline-none placeholder-gray-600", 
                                    placeholder: "V-12345678" 
                                })
                             )
                        ),

                        React.createElement('div', { className: "space-y-1" },
                             React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-wider" }, "Email"),
                             React.createElement('div', { className: "bg-dark-surface/50 border border-white/5 rounded-2xl flex items-center px-4 opacity-70" },
                                React.createElement(Mail, { size: 16, className: "text-gray-500 mr-3" }),
                                React.createElement('input', { 
                                    value: profileData.email, 
                                    readOnly: true,
                                    className: "w-full py-4 bg-transparent text-gray-400 font-medium focus:outline-none cursor-not-allowed", 
                                })
                             )
                        ),
                    ),

                    React.createElement('div', { className: "space-y-3 pt-4" },
                        React.createElement(Button, { variant: "ghost", onClick: handlePasswordReset, className: "text-brand hover:text-brand-light" }, "Cambiar Contraseña"),
                        React.createElement(Button, { variant: "destructive", onClick: onLogout }, "Cerrar Sesión"),
                        
                        React.createElement('div', { className: "pt-6 border-t border-white/10 mt-6" },
                            React.createElement('button', { onClick: handleResetTransactions, className: "w-full py-4 rounded-xl bg-red-900/20 text-red-500 border border-red-500/30 font-bold mb-3 flex items-center justify-center gap-2" }, 
                                React.createElement(AlertOctagon, { size: 18 }), "Resetear Movimientos"
                            ),
                            React.createElement('button', { onClick: handleDeleteAccount, className: "w-full py-4 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest" }, "Eliminar mi cuenta")
                        )
                    )
                )
            );
        };

        const ConfigView = ({ pnlData, onUpdatePnl, userId }) => {
            const [newConcept, setNewConcept] = useState("");
            const [activeSegment, setActiveSegment] = useState("ingresos");
            const [saveStatus, setSaveStatus] = useState('idle');
            
            // Estado para edición
            const [editingIndex, setEditingIndex] = useState(-1);
            const [editingText, setEditingText] = useState("");

            const handleAdd = async () => {
                if (!newConcept.trim()) return;
                setSaveStatus('saving');
                const updatedList = [...(pnlData[activeSegment] || []), newConcept.trim()];
                const newData = { ...pnlData, [activeSegment]: updatedList };
                await onUpdatePnl(newData);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
                setNewConcept("");
            };

            const handleDelete = async (segment, index) => {
                setSaveStatus('saving');
                const updatedList = pnlData[segment].filter((_, i) => i !== index);
                const correctedData = { ...pnlData, [segment]: updatedList };
                await onUpdatePnl(correctedData);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            };

            const startEditing = (index, currentText) => {
                setEditingIndex(index);
                setEditingText(currentText);
            };

            const saveEdit = async () => {
                if (!editingText.trim()) return;
                setSaveStatus('saving');
                const updatedList = [...(pnlData[activeSegment] || [])];
                updatedList[editingIndex] = editingText.trim();
                const newData = { ...pnlData, [activeSegment]: updatedList };
                await onUpdatePnl(newData);
                setSaveStatus('saved');
                setEditingIndex(-1);
                setTimeout(() => setSaveStatus('idle'), 2000);
            };

            return React.createElement('div', { className: "h-full flex flex-col bg-app-bg", style: { paddingTop: "calc(env(safe-area-inset-top) + 24px)" } },
                React.createElement('div', { className: "px-6 flex justify-between items-start" },
                    React.createElement('div', { className: "mb-6" }, 
                        React.createElement('h2', { className: "text-2xl font-black text-white tracking-tight" }, "Personalización"),
                        React.createElement('p', { className: "text-gray-400 font-light text-sm" }, "Categorías y conceptos")
                    )
                ),
                React.createElement('div', { className: "flex-1 overflow-y-auto px-6 pb-32" },
                    React.createElement('div', { className: "flex gap-3 overflow-x-auto pb-4 mb-2 scrollbar-hide" },
                        ["ingresos", "ahorro", "gastos_fijos", "gastos_variables"].map(seg => 
                            React.createElement('button', {
                                key: seg, onClick: () => { setActiveSegment(seg); setEditingIndex(-1); },
                                className: `px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeSegment === seg ? 'bg-brand text-black shadow-neon' : 'bg-dark-surface text-gray-400 border border-white/10'}`
                            }, SEGMENTS[seg].label)
                        )
                    ),
                    
                    React.createElement('div', { className: "flex gap-2 mb-6" },
                        React.createElement('input', { 
                            value: newConcept, onChange: (e) => setNewConcept(e.target.value), placeholder: "Nuevo concepto...",
                            className: "flex-1 p-4 rounded-2xl glass-input text-white focus:outline-none shadow-sm"
                        }),
                        React.createElement('button', { onClick: handleAdd, className: "bg-white text-black p-4 rounded-2xl hover:bg-gray-200 transition-colors btn-press" }, React.createElement(Plus, { size: 20 }))
                    ),

                    React.createElement('div', { className: "space-y-3" },
                        (pnlData[activeSegment] || []).map((concept, idx) => 
                            React.createElement('div', { key: idx, className: "flex justify-between items-center p-4 bg-dark-card rounded-2xl border border-gray-800" },
                                editingIndex === idx ? (
                                    React.createElement('div', { className: "flex items-center gap-2 w-full" },
                                        React.createElement('input', {
                                            value: editingText,
                                            onChange: (e) => setEditingText(e.target.value),
                                            className: "flex-1 bg-transparent border-b border-brand text-white font-medium focus:outline-none py-1",
                                            autoFocus: true
                                        }),
                                        React.createElement('button', { onClick: saveEdit, className: "p-2 text-brand hover:bg-emerald-500/10 rounded-full" }, React.createElement(Check, { size: 18 })),
                                        React.createElement('button', { onClick: () => setEditingIndex(-1), className: "p-2 text-gray-400 hover:text-white" }, React.createElement(X, { size: 18 }))
                                    )
                                ) : (
                                    React.createElement(React.Fragment, null,
                                        React.createElement('span', { className: "font-medium text-gray-200" }, concept),
                                        React.createElement('div', { className: "flex items-center gap-1" },
                                            React.createElement('button', { onClick: () => startEditing(idx, concept), className: "text-gray-400 p-2 hover:text-white rounded-lg transition-colors" }, React.createElement(Pencil, { size: 16 })),
                                            React.createElement('button', { onClick: () => handleDelete(activeSegment, idx), className: "text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors" }, React.createElement(Trash2, { size: 18 }))
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                React.createElement(AutoSaveStatus, { status: saveStatus })
            );
        };

        // --- BUDGET VIEW CON DEBOUNCE MEJORADO ---
        const BudgetView = ({ pnlStructure, budgets, onUpdateBudgets, transactions }) => {
            const [localBudgets, setLocalBudgets] = useState(budgets || {});
            const [showInfo, setShowInfo] = useState(false);
            const [saveStatus, setSaveStatus] = useState('idle');
            const timeoutRef = useRef(null);

            useEffect(() => { setLocalBudgets(budgets || {}); }, [budgets]);

            const financials = useMemo(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const spending = {};
                let income = 0; let savings = 0; let fixed = 0; let variableTotal = 0;
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                        const amount = t.amountUSD || 0;
                        if (t.segment === 'gastos_variables') {
                            if (!spending[t.category]) spending[t.category] = 0;
                            spending[t.category] += amount;
                            variableTotal += amount;
                        } else if (t.segment === 'ingresos') income += amount;
                        else if (t.segment === 'ahorro') savings += amount;
                        else if (t.segment === 'gastos_fijos') fixed += amount;
                    }
                });
                return { spending, income, savings, fixed, variableTotal };
            }, [transactions]);

            const handleBudgetChange = (category, value) => {
                const val = parseFloat(value) || 0;
                const newBudgets = { ...localBudgets, [category]: val };
                setLocalBudgets(newBudgets);
                
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setSaveStatus('idle');
                
                timeoutRef.current = setTimeout(async () => {
                    setSaveStatus('saving');
                    try {
                        await onUpdateBudgets(newBudgets);
                        setSaveStatus('saved');
                        setTimeout(() => setSaveStatus('idle'), 2000);
                    } catch (e) {
                        console.error("Error al guardar presupuesto:", e);
                        setSaveStatus('idle');
                    }
                }, 1500);
            };

            const totalBudget = Object.values(localBudgets).reduce((a, b) => a + b, 0);
            const progress = totalBudget > 0 ? (financials.variableTotal / totalBudget) * 100 : 0;
            const realAvailable = (financials.income - financials.savings) - financials.fixed;

            return React.createElement('div', { className: "h-full flex flex-col bg-app-bg animate-fade-in", style: { paddingTop: "calc(env(safe-area-inset-top) + 24px)" } },
                showInfo && React.createElement('div', { 
                    className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fade-in",
                    onClick: () => setShowInfo(false)
                },
                    React.createElement('div', { className: "bg-dark-card p-6 rounded-3xl border border-white/10 max-w-sm w-full animate-bounce-in shadow-glass", onClick: e => e.stopPropagation() },
                        React.createElement('div', { className: "flex items-center gap-3 mb-4" },
                            React.createElement('div', { className: "p-3 bg-purple-500/20 text-purple-400 rounded-full" }, React.createElement(Info, { size: 24 })),
                            React.createElement('h3', { className: "text-xl font-bold text-white" }, "Guía de Presupuestos")
                        ),
                        React.createElement('div', { className: "text-gray-300 leading-relaxed space-y-4 mb-6 text-sm" },
                             React.createElement('p', null, "Controla aquí tus ", React.createElement('strong', { className: "text-white" }, "Gastos Variables"), "."),
                             React.createElement('div', { className: "p-3 bg-white/5 rounded-xl border border-white/5" },
                                React.createElement('strong', { className: "block text-purple-400 mb-1" }, "Disponible Flexible"),
                                React.createElement('p', null, "Es el dinero que te queda libre después de restar Ahorros y Gastos Fijos a tus Ingresos."),
                                React.createElement('p', { className: "mt-2 font-mono text-xs bg-black/30 p-2 rounded text-center text-gray-400" }, "INGRESOS - AHORRO - FIJOS")
                             ),
                             React.createElement('div', null,
                                React.createElement('strong', { className: "block text-white mb-1" }, "Partidas de Gastos"),
                                React.createElement('p', null, "Aquí están tus categorías de Gastos Variables (configuradas en Personalización). Define un tope para cada una y aumenta tu capacidad de ahorro.")
                             )
                        ),
                        React.createElement('button', { 
                            onClick: () => setShowInfo(false),
                            className: "w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                        }, "Entendido")
                    )
                ),

                React.createElement('div', { className: "px-6 mb-6 flex justify-between items-start" },
                    React.createElement('div', null, 
                        React.createElement('h2', { className: "text-2xl font-black text-white tracking-tight" }, "Presupuestos"),
                        React.createElement('p', { className: "text-gray-400 text-sm mt-1 font-medium" }, "Controla tus gastos variables")
                    ),
                    React.createElement('button', { 
                        onClick: () => setShowInfo(true),
                        className: "p-2 bg-dark-card border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    }, React.createElement(HelpCircle, { size: 24 }))
                ),
                
                React.createElement('div', { className: "px-6 pb-2" },
                     React.createElement('div', { className: "bg-dark-surface p-6 rounded-[2.5rem] relative overflow-hidden border border-white/5" },
                        
                        React.createElement('div', { className: "flex justify-between items-end mb-6 relative z-10" },
                            React.createElement('div', null,
                                React.createElement('div', { className: "flex items-center gap-2 mb-1" },
                                    React.createElement('p', { className: "text-xs text-purple-400 font-bold uppercase tracking-wider" }, "Disponible Flexible"),
                                ),
                                React.createElement('p', { className: `text-4xl font-black tracking-tighter ${realAvailable >= 0 ? 'text-white' : 'text-red-500'}` }, `$${realAvailable.toFixed(2)}`)
                            ),
                            React.createElement('div', { className: "text-right" },
                                React.createElement('p', { className: "text-[10px] text-brand font-bold uppercase tracking-wider mb-1" }, "Meta Gastos"),
                                React.createElement('div', { className: "px-3 py-1 bg-dark-base/50 rounded-lg border border-white/5" },
                                    React.createElement('p', { className: "text-sm font-bold text-white" }, `$${totalBudget.toFixed(0)}`)
                                )
                            )
                        ),
                        React.createElement('div', { className: "relative" },
                            React.createElement('div', { className: "flex justify-between text-[10px] font-bold text-gray-500 mb-1 uppercase" },
                                React.createElement('span', null, "Progreso de consumo"),
                                React.createElement('span', { className: progress > 100 ? "text-red-500" : "text-brand" }, `${progress.toFixed(0)}%`)
                            ),
                            React.createElement('div', { className: "w-full bg-dark-base rounded-full h-4 overflow-hidden border border-white/5" },
                                React.createElement('div', { className: `h-full rounded-full transition-all duration-700 ease-out ${progress > 100 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-bar-gradient shadow-neon'}`, style: { width: `${Math.min(progress, 100)}%` } })
                            )
                        )
                    )
                ),

                React.createElement('div', { className: "flex-1 overflow-y-auto px-6 pb-36 mt-6 space-y-4" },
                    (pnlStructure['gastos_variables'] || []).map((category, idx) => {
                        const budget = localBudgets[category] || 0;
                        const spent = financials.spending[category] || 0; 
                        const percent = budget > 0 ? (spent / budget) * 100 : 0;
                        let barClass = 'bg-brand shadow-neon';
                        let statusColor = 'text-gray-400';
                        if (percent > 80) { barClass = 'bg-yellow-500'; statusColor = 'text-yellow-500'; }
                        if (percent > 100) { barClass = 'bg-red-500'; statusColor = 'text-red-500'; }

                        return React.createElement('div', { key: idx, className: "bg-dark-surface p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors" },
                            React.createElement('div', { className: "flex justify-between items-center mb-4" },
                                React.createElement('div', null,
                                    React.createElement('span', { className: "font-bold text-white block text-lg" }, category),
                                    React.createElement('span', { className: `text-xs font-medium ${statusColor}` }, `$${spent.toFixed(0)} gastados`)
                                ),
                                React.createElement('div', { className: "flex items-center gap-2 bg-dark-base rounded-xl px-4 py-3 border border-white/5 focus-within:border-brand/50 transition-colors" },
                                    React.createElement('span', { className: "text-sm text-gray-500 font-bold" }, "$"),
                                    React.createElement('input', {
                                        type: "number", value: localBudgets[category] || '', onChange: (e) => handleBudgetChange(category, e.target.value),
                                        placeholder: "0", className: "w-16 bg-transparent text-right text-base font-bold text-white focus:outline-none placeholder-gray-700"
                                    })
                                )
                            ),
                            React.createElement('div', { className: "w-full bg-gray-800/50 rounded-full h-2 overflow-hidden" },
                                React.createElement('div', { className: `h-full rounded-full transition-all duration-500 ${barClass}`, style: { width: `${Math.min(percent, 100)}%` } })
                            )
                        );
                    })
                ),
                React.createElement(AutoSaveStatus, { status: saveStatus })
            );
        };

        // --- NUEVA MODAL DE TASAS (ESTILO INFO) ---
        const RatesModal = ({ onClose, rates }) => {
            const today = new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'numeric' });
            
            const gap = useMemo(() => { if (!rates.bcv || !rates.parallel) return 0; return ((rates.parallel - rates.bcv) / rates.bcv) * 100; }, [rates]);

            return React.createElement('div', { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fade-in" },
                React.createElement('div', { className: "bg-dark-card p-6 rounded-[2rem] border border-white/10 max-w-sm w-full animate-bounce-in shadow-glass" },
                    
                    React.createElement('div', { className: "flex justify-between items-center mb-6" }, 
                        React.createElement('div', { className: "flex items-baseline gap-2" },
                            React.createElement('h3', { className: "text-xl font-bold text-white tracking-tight" }, "Tasas del Día"),
                            React.createElement('span', { className: "text-sm text-gray-500 font-medium" }, today)
                        ),
                        React.createElement('button', { onClick: onClose, className: "p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors" }, React.createElement(X, { size: 20 }))
                    ),
                    
                    React.createElement('div', { className: "space-y-3 mb-6" },
                         // BCV Card
                         React.createElement('div', { className: "p-4 bg-dark-surface rounded-2xl border border-white/5 flex justify-between items-center" },
                           React.createElement('div', { className: "flex flex-col" },
                                React.createElement('span', { className: "text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1" }, "BCV OFICIAL"),
                                React.createElement('span', { className: "text-2xl font-black text-white" }, rates.bcv?.toFixed(2))
                           ),
                           React.createElement('div', { className: "w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400" }, React.createElement(DollarSign, { size: 20 }))
                         ),
                         
                         // Parallel Card
                         React.createElement('div', { className: "p-4 bg-dark-surface rounded-2xl border border-white/5 flex justify-between items-center" },
                           React.createElement('div', { className: "flex flex-col" },
                                React.createElement('span', { className: "text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1" }, "DÓLAR USDC"),
                                React.createElement('span', { className: "text-2xl font-black text-emerald-400" }, rates.parallel?.toFixed(2))
                           ),
                           React.createElement('div', { className: "flex flex-col items-end" },
                                React.createElement('span', { className: "text-[9px] text-gray-500 font-bold uppercase mb-1" }, "BRECHA"),
                                React.createElement('span', { className: `text-xs font-bold px-2 py-1 rounded-md ${gap > 10 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}` }, `${gap.toFixed(2)}%`)
                           )
                         ),
                         
                         // Euro Card
                         React.createElement('div', { className: "p-4 bg-dark-surface rounded-2xl border border-white/5 flex justify-between items-center" },
                           React.createElement('div', { className: "flex flex-col" },
                                React.createElement('span', { className: "text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1" }, "EURO BCV"),
                                React.createElement('span', { className: "text-2xl font-black text-blue-400" }, rates.eur?.toFixed(2)),
                                rates.eurCross > 0 && React.createElement('span', { className: "text-[9px] text-gray-600 mt-1 font-mono" }, `1 EUR = ${rates.eurCross.toFixed(4)} USD`)
                           ),
                           React.createElement('div', { className: "w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400" }, React.createElement(Euro, { size: 20 }))
                         )
                    )
                )
            );
        };

        const TransactionModal = ({ onClose, rates, userId, pnlStructure, initialData, projectDocId }) => {
            const isEditing = !!initialData;
            const [segment, setSegment] = useState(initialData?.segment || 'gastos_variables'); 
            const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : '');
            const [currency, setCurrency] = useState(initialData?.currency || 'VES');
            const [category, setCategory] = useState(initialData?.category || '');
            const [description, setDescription] = useState(initialData?.description || '');
            const [rateType, setRateType] = useState(initialData ? 'manual' : (initialData?.currency === 'EUR' ? 'eur' : 'bcv'));
            const [customRate, setCustomRate] = useState(initialData ? initialData.originalRate : (rates.bcv || 0));
            const [recurrence, setRecurrence] = useState('none');
            const [date, setDate] = useState(() => {
                if (initialData && initialData.date) return initialData.date.split('T')[0];
                return getLocalDateString();
            });
            const [isSaving, setIsSaving] = useState(false); 

            useEffect(() => {
                const concepts = (pnlStructure && pnlStructure[segment]) || [];
                if ((!category || !concepts.includes(category)) && concepts.length > 0 && !isEditing) setCategory(concepts[0]);
            }, [segment, pnlStructure]);

            const calculatedUSD = useMemo(() => {
                if (!amount) return 0;
                if (currency === 'USD') return parseFloat(amount);
                
                if (currency === 'EUR') {
                    const eurRateInBs = rateType === 'manual' ? customRate : (rates.eur || 0);
                    const usdRateInBs = rates.bcv || 1; 
                    if (eurRateInBs === 0 || usdRateInBs === 0) return 0;
                    const amountInBs = parseFloat(amount) * eurRateInBs;
                    return amountInBs / usdRateInBs;
                }

                let rate = rateType === 'bcv' ? rates.bcv : (rateType === 'parallel' ? rates.parallel : customRate);
                if (!rate || rate === 0) return 0;
                return parseFloat(amount) / rate;
            }, [amount, currency, rateType, customRate, rates]);

            const handleSubmit = async (e) => {
                e.preventDefault(); if (!amount || !category) return; setIsSaving(true); 
                
                let finalRate = 1;
                if (currency === 'USD') finalRate = 1;
                else if (currency === 'VES') finalRate = rateType === 'bcv' ? rates.bcv : (rateType === 'parallel' ? rates.parallel : customRate);
                else if (currency === 'EUR') finalRate = rateType === 'manual' ? customRate : (rates.eur || 0);

                const type = SEGMENTS[segment].type;
                
                let finalDateObj = new Date(date + "T12:00:00");
                if (isEditing) {
                    const prev = new Date(initialData.date);
                    if (getLocalDateString(prev) === date) finalDateObj = prev;
                } else {
                    const now = new Date();
                    if (getLocalDateString(now) === date) finalDateObj = now;
                }
                const finalDate = finalDateObj.toISOString();

                const transactionData = { type, segment, amount: parseFloat(amount), currency, originalRate: parseFloat(finalRate), amountUSD: calculatedUSD, category, description, profileId: 'personal' };
                
                try {
                    if (isEditing) {
                         await setDoc(doc(db, ROOT_COLLECTION, projectDocId, 'users', userId, 'transactions', initialData.id), { ...transactionData, date: finalDate }, { merge: true });
                    } else {
                        const batch = writeBatch(db);
                        const mainRef = doc(collection(db, ROOT_COLLECTION, projectDocId, 'users', userId, 'transactions'));
                        batch.set(mainRef, { ...transactionData, date: finalDate });

                        if (recurrence !== 'none') {
                            const currentYear = new Date().getFullYear();
                            const limitDate = new Date(currentYear, 11, 31, 23, 59, 59); 
                            let nextDate = new Date(finalDateObj);
                            let safetyCounter = 0;
                            while (true) {
                                safetyCounter++;
                                if (safetyCounter > 370) break; 
                                if (recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                                else if (recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                                else if (recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                                else if (recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                                else if (recurrence === 'quadrimester') nextDate.setMonth(nextDate.getMonth() + 4);
                                else if (recurrence === 'biannual') nextDate.setMonth(nextDate.getMonth() + 6);
                                if (nextDate > limitDate) break;
                                const newRef = doc(collection(db, ROOT_COLLECTION, projectDocId, 'users', userId, 'transactions'));
                                batch.set(newRef, { ...transactionData, date: nextDate.toISOString() });
                            }
                        }
                        await batch.commit();
                    }
                    onClose();
                } catch (error) { alert("Error: " + error.message); } finally { setIsSaving(false); }
            };

            const handleDelete = async () => {
                if (confirm("¿Eliminar movimiento?")) {
                    setIsSaving(true);
                    try { await deleteDoc(doc(db, ROOT_COLLECTION, projectDocId, 'users', userId, 'transactions', initialData.id)); onClose(); } 
                    catch (error) { alert("Error: " + error.message); } finally { setIsSaving(false); }
                }
            };
            
            const isValid = amount && parseFloat(amount) > 0 && category;

            return React.createElement('div', { className: "fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end sm:items-center justify-center animate-fade-in" },
                React.createElement('div', { className: "glass-panel-premium w-full max-md p-5 rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[95dvh] overflow-y-auto animate-slide-up flex flex-col" },
                    React.createElement('div', { className: "flex justify-between items-center mb-4 flex-shrink-0" }, 
                        React.createElement('h2', { className: "text-lg font-bold text-white tracking-tight" }, isEditing ? "Editar" : "Nuevo Movimiento"), 
                        React.createElement('button', { onClick: onClose, className: "p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors" }, React.createElement(X, { size: 24 }))
                    ),
                    
                    React.createElement('div', { className: "flex gap-2 overflow-x-auto pb-2 mb-0 scrollbar-hide justify-start w-full flex-shrink-0" }, 
                        Object.keys(SEGMENTS).map(key => 
                            React.createElement('button', { 
                                key: key, onClick: () => setSegment(key), 
                                className: `px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${segment === key ? `${SEGMENTS[key].bg} ${SEGMENTS[key].color} ${SEGMENTS[key].border} shadow-neon` : 'bg-dark-surface/50 text-gray-500 border-transparent hover:bg-white/5'}` 
                            }, SEGMENTS[key].label)
                        )
                    ),
                    
                    React.createElement('form', { onSubmit: handleSubmit, className: "space-y-2 flex-1 flex flex-col" },
                        React.createElement('div', { className: "flex flex-col items-center justify-center mt-0" },
                            React.createElement('div', { className: "relative w-full" },
                                React.createElement('input', { 
                                    type: "number", inputMode: "decimal", step: "0.01", placeholder: "0.00", value: amount, onChange: e => setAmount(e.target.value), 
                                    className: "w-full bg-transparent text-center text-5xl font-black text-white placeholder-gray-700 focus:outline-none py-4" 
                                }),
                                React.createElement('span', { className: "block text-center text-sm font-bold text-gray-500 uppercase tracking-widest" }, 
                                    currency === 'USD' ? 'Dólares (USD)' : (currency === 'EUR' ? 'Euros (EUR)' : 'Bolívares (VES)')
                                )
                            ),
                            React.createElement('div', { className: "flex bg-dark-surface/80 rounded-full p-1 mt-2 border border-white/5" },
                                React.createElement('button', { type: "button", onClick: () => setCurrency('VES'), className: `px-5 py-2 rounded-full text-xs font-bold transition-all ${currency === 'VES' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}` }, "Bs"),
                                React.createElement('button', { type: "button", onClick: () => setCurrency('USD'), className: `px-5 py-2 rounded-full text-xs font-bold transition-all ${currency === 'USD' ? 'bg-emerald-500 text-white shadow-neon' : 'text-gray-500 hover:text-white'}` }, "USD"),
                                React.createElement('button', { type: "button", onClick: () => setCurrency('EUR'), className: `px-5 py-2 rounded-full text-xs font-bold transition-all ${currency === 'EUR' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}` }, "EUR")
                            )
                        ),

                        React.createElement('div', { className: "grid grid-cols-2 gap-2" },
                             React.createElement('div', { className: "min-w-0" },
                                React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 mb-1 block" }, "Fecha"),
                                React.createElement('input', { type: "date", value: date, onChange: e => setDate(e.target.value), className: "w-full px-3 py-3 bg-dark-surface/50 rounded-2xl text-white outline-none border border-white/5 font-medium text-sm text-center appearance-none min-w-0" })
                             ),
                             React.createElement('div', { className: "min-w-0" },
                                React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 mb-1 block" }, "Categoría"),
                                React.createElement('select', { value: category, onChange: e => setCategory(e.target.value), className: "w-full px-3 py-3 bg-dark-surface/50 text-white rounded-2xl outline-none border border-white/5 font-medium text-sm appearance-none min-w-0" }, (pnlStructure && pnlStructure[segment] ? pnlStructure[segment] : []).map(c => React.createElement('option', { key: c, value: c }, c)))
                             )
                        ),

                        !isEditing && React.createElement('div', { className: "min-w-0" },
                            React.createElement('label', { className: "text-[10px] font-bold text-gray-500 uppercase ml-2 mb-1 block" }, "Repetir"),
                            React.createElement('div', { className: "relative" },
                                React.createElement('select', { 
                                    value: recurrence, 
                                    onChange: e => setRecurrence(e.target.value),
                                    className: "w-full px-3 py-3 bg-dark-surface/50 text-white rounded-2xl outline-none border border-white/5 font-medium text-sm appearance-none"
                                }, 
                                    RECURRENCE_OPTIONS.map(opt => React.createElement('option', { key: opt.id, value: opt.id }, opt.label))
                                ),
                                React.createElement(ChevronDown, { size: 16, className: "absolute right-3 top-3.5 text-gray-500 pointer-events-none" })
                            )
                        ),
                        
                        currency === 'VES' && React.createElement('div', { className: "bg-dark-surface/30 p-4 rounded-2xl border border-white/5" },
                            React.createElement('div', { className: "grid grid-cols-3 gap-2" },
                                React.createElement('button', { type: "button", onClick: () => setRateType('bcv'), className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${rateType === 'bcv' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-gray-500 border-gray-700'}` }, "BCV", React.createElement('br'), rates.bcv?.toFixed(2)),
                                React.createElement('button', { type: "button", onClick: () => setRateType('parallel'), className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${rateType === 'parallel' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-gray-500 border-gray-700'}` }, "USDC", React.createElement('br'), rates.parallel?.toFixed(2)),
                                React.createElement('button', { type: "button", onClick: () => setRateType('manual'), className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${rateType === 'manual' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-gray-500 border-gray-700'}` }, "Manual")
                            ),
                            rateType === 'manual' && React.createElement('input', { type: "number", value: customRate, onChange: e => setCustomRate(e.target.value), className: "w-full mt-3 p-3 rounded-xl bg-dark-base border border-gray-700 text-center font-bold text-brand-light focus:outline-none", placeholder: "Tasa personalizada" })
                        ),

                        currency === 'EUR' && React.createElement('div', { className: "bg-dark-surface/30 p-4 rounded-2xl border border-white/5" },
                            React.createElement('div', { className: "grid grid-cols-2 gap-2" },
                                React.createElement('button', { type: "button", onClick: () => { setRateType('eur'); setCustomRate(rates.eur); }, className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${rateType !== 'manual' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'bg-transparent text-gray-500 border-gray-700'}` }, "TASA EURO BCV", React.createElement('br'), rates.eur?.toFixed(2) || 0),
                                React.createElement('button', { type: "button", onClick: () => setRateType('manual'), className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${rateType === 'manual' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'bg-transparent text-gray-500 border-gray-700'}` }, "Manual")
                            ),
                            rateType === 'manual' && React.createElement('input', { type: "number", value: customRate, onChange: e => setCustomRate(e.target.value), className: "w-full mt-3 p-3 rounded-xl bg-dark-base border border-gray-700 text-center font-bold text-brand-light focus:outline-none", placeholder: "Tasa Euro personalizada" })
                        ),

                        React.createElement('div', null, 
                            React.createElement('input', { type: "text", value: description, onChange: e => setDescription(e.target.value), className: "w-full p-3 bg-dark-surface/50 text-white rounded-2xl focus:outline-none border border-white/5 font-medium text-sm", placeholder: "Nota opcional" })
                        ),

                        segment === 'ahorro' && currency === 'VES' && React.createElement('div', { className: "mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-center animate-fade-in" },
                            React.createElement(AlertTriangle, { className: "text-red-500 shrink-0", size: 20 }),
                            React.createElement('p', { className: "text-xs text-red-400 leading-tight" },
                                React.createElement('strong', null, "Ahorrar en Bolívares "),
                                "puede provocar una pérdida del valor de tu ahorro."
                            )
                        ),
                        
                        React.createElement('div', { className: "flex-1" }),
                        React.createElement('div', { className: "text-center py-1" }, React.createElement('span', { className: "text-gray-500 text-xs font-medium" }, "Ref. USD Reporte: "), React.createElement('span', { className: "text-xl font-bold text-brand-light ml-2" }, `$${calculatedUSD.toFixed(2)}`)),
                        React.createElement('div', { className: "flex gap-3 safe-bottom" }, 
                            isEditing && React.createElement('button', { type: "button", onClick: handleDelete, disabled: isSaving, className: "p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20" }, React.createElement(Trash2, { size: 24 })),
                            React.createElement(Button, { type: "submit", className: "flex-1", disabled: !isValid || isSaving }, isSaving ? "Guardando..." : (isEditing ? "Actualizar" : "Guardar"))
                        )
                    )
                )
            );
        };

        const HomeView = ({ rates, transactions, onUpdateRate, user, onOpenProfile, onOpenReport, onNavigateToHistory }) => {
            const [showRatesModal, setShowRatesModal] = useState(false);
            const [showHelpModal, setShowHelpModal] = useState(false);
            const [currentDate, setCurrentDate] = useState(new Date());
            const [viewMode, setViewMode] = useState('month'); // 'month', 'ytd', 'year'

            useEffect(() => {
                const hasSeenIntro = localStorage.getItem('sencillo_intro_seen');
                if (!hasSeenIntro) {
                    setShowHelpModal(true);
                }
            }, []);

            const handleCloseHelp = (dontShowAgain) => {
                if (dontShowAgain) {
                    localStorage.setItem('sencillo_intro_seen', 'true');
                }
                setShowHelpModal(false);
            };

            const prevMonth = () => { 
                const newDate = new Date(currentDate); 
                newDate.setMonth(newDate.getMonth() - 1); 
                setCurrentDate(newDate); 
            };
            const nextMonth = () => { 
                const newDate = new Date(currentDate); 
                newDate.setMonth(newDate.getMonth() + 1); 
                setCurrentDate(newDate); 
            };
            
            const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const yearLabel = currentDate.getFullYear().toString();
            const formattedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

            const dashboardData = useMemo(() => {
                const selectedMonth = currentDate.getMonth();
                const selectedYear = currentDate.getFullYear();
                
                let ingresos = 0, gastos = 0, gastosFijos = 0, gastosVariables = 0, ahorro = 0, balance = 0;
                
                // Nuevos acumuladores para desglose
                let ingresosVES = 0, ingresosHard = 0; // Hard = USD + EUR (en valor USD)
                let gastosVES = 0, gastosHard = 0;
                let gastosFijosVES = 0, gastosFijosHard = 0;
                let gastosVariablesVES = 0, gastosVariablesHard = 0;
                let ahorroVES = 0, ahorroHard = 0;
                let balanceVES = 0, balanceHard = 0;
                let balanceBsOriginalUSD = 0;

                let ahorroBsOriginalUSD = 0;

                transactions.forEach(t => {
                    if (!t.date) return;
                    const tDate = new Date(t.date);
                    if (isNaN(tDate.getTime())) return;
                    
                    const tYear = tDate.getFullYear();
                    const tMonth = tDate.getMonth();

                    // FILTER LOGIC
                    let includeTransaction = false;
                    
                    if (viewMode === 'month') {
                        includeTransaction = (tYear === selectedYear && tMonth === selectedMonth);
                    } else if (viewMode === 'ytd') {
                        includeTransaction = (tYear === selectedYear && tMonth <= selectedMonth);
                    } else if (viewMode === 'year') {
                        includeTransaction = (tYear === selectedYear);
                    }

                    if (includeTransaction) {
                        const amountUSD = t.amountUSD || 0;
                        const isVES = t.currency === 'VES';
                        const amountRaw = t.amount || 0;

                        if (t.segment === 'ingresos') {
                            ingresos += amountUSD;
                            if (isVES) ingresosVES += amountRaw;
                            else ingresosHard += amountUSD;
                        }
                        else if (t.segment === 'ahorro') {
                            ahorro += amountUSD;
                            if (isVES) {
                                ahorroVES += amountRaw;
                                ahorroBsOriginalUSD += amountUSD;
                            } else {
                                ahorroHard += amountUSD;
                            }
                        }
                        else { // Gastos (fijos y variables)
                            gastos += amountUSD;
                            if (isVES) gastosVES += amountRaw;
                            else gastosHard += amountUSD;

                            if (t.segment === 'gastos_fijos') {
                                gastosFijos += amountUSD;
                                if (isVES) gastosFijosVES += amountRaw;
                                else gastosFijosHard += amountUSD;
                            } else if (t.segment === 'gastos_variables') {
                                gastosVariables += amountUSD;
                                if (isVES) gastosVariablesVES += amountRaw;
                                else gastosVariablesHard += amountUSD;
                            }
                        }
                        
                        // Balance
                        if (t.type === 'income') {
                            balance += amountUSD;
                            if (isVES) {
                                balanceVES += amountRaw;
                                balanceBsOriginalUSD += amountUSD;
                            } else {
                                balanceHard += amountUSD;
                            }
                        } else {
                            balance -= amountUSD;
                            if (isVES) {
                                balanceVES -= amountRaw;
                                balanceBsOriginalUSD -= amountUSD;
                            } else {
                                balanceHard -= amountUSD;
                            }
                        }
                    }
                });
                return { 
                    ingresos, gastos, gastosFijos, gastosVariables, ahorro, balance,
                    ingresosVES, ingresosHard,
                    gastosVES, gastosHard,
                    gastosFijosVES, gastosFijosHard,
                    gastosVariablesVES, gastosVariablesHard,
                    ahorroVES, ahorroHard,
                    ahorroBsOriginalUSD,
                    balanceVES, balanceHard, balanceBsOriginalUSD
                };
            }, [transactions, currentDate, viewMode]);

            // Calculo de devaluacion del ahorro en Bs (Global)
            const devaluationData = useMemo(() => {
                if (dashboardData.ahorroVES <= 0 || !rates.bcv || rates.bcv === 0) return { percent: 0, currentVal: 0 };
                const currentValUSD = dashboardData.ahorroVES / rates.bcv;
                const originalValUSD = dashboardData.ahorroBsOriginalUSD;
                if (originalValUSD === 0) return { percent: 0, currentVal: currentValUSD };
                const percent = ((currentValUSD - originalValUSD) / originalValUSD) * 100;
                return { percent, currentVal: currentValUSD };
            }, [dashboardData.ahorroVES, dashboardData.ahorroBsOriginalUSD, rates.bcv]);

            const username = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

            const renderKPI = (title, totalUSD, totalVES, totalHard, icon, colorClass, iconColorClass, onClickFilter, showDeval = false, customDevalPercent = null) => {
                let devalPercentToUse = 0;
                if (showDeval) devalPercentToUse = devaluationData.percent;
                else if (customDevalPercent !== null) devalPercentToUse = customDevalPercent;

                const hasDeval = (showDeval || customDevalPercent !== null) && devalPercentToUse !== 0;

                return React.createElement('div', { 
                    onClick: () => onClickFilter === 'all' ? onNavigateToHistory('all') : onNavigateToHistory(onClickFilter),
                    className: "bg-dark-surface border border-white/5 p-4 rounded-xl flex flex-col gap-2 cursor-pointer hover:bg-white/5 transition-colors active:scale-95 group relative overflow-hidden" 
                },
                    React.createElement('div', { className: "flex items-center gap-2 relative z-10" },
                        React.createElement('div', { className: `p-1.5 rounded-md ${iconColorClass}` }, icon),
                        React.createElement('span', { className: "text-[10px] text-gray-400 uppercase font-bold tracking-wider" }, title)
                    ),
                    React.createElement('div', { className: "pl-1 relative z-10 flex h-full flex-col" },
                        React.createElement('span', { className: `text-lg font-bold block ${colorClass}` }, `$${totalUSD.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`),
                        
                        (Math.abs(totalVES) > 0 || totalHard > 0) && React.createElement('div', { className: "mt-auto ml-auto flex flex-col items-end gap-1" },
                            React.createElement('span', { className: "inline-flex items-center gap-1.5 text-[10px] leading-none font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap" },
                                React.createElement('span', { className: "text-gray-500/80" }, '$'),
                                React.createElement('span', { className: "tabular-nums" }, totalHard.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}))
                            ),
                            React.createElement('span', { className: `inline-flex items-center gap-1.5 text-[10px] leading-none font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${hasDeval ? (devalPercentToUse < 0 ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10') : 'text-gray-500 bg-white/5'}` },
                                React.createElement('span', { className: hasDeval ? 'opacity-80' : 'text-gray-500/80' }, 'Bs'),
                                React.createElement('span', { className: "tabular-nums" },
                                    `${totalVES.toLocaleString(undefined, {compactDisplay: "short", notation: "compact"})}${hasDeval ? ` (${devalPercentToUse > 0 ? '+' : ''}${devalPercentToUse.toFixed(0)}%)` : ''}`
                                )
                            )
                        )
                    )
                );
            };

            return React.createElement('div', { className: "px-6 pb-32 space-y-4 animate-fade-in", style: { paddingTop: "calc(env(safe-area-inset-top) + 24px)" } },
                React.createElement('header', { className: "flex justify-between items-center mb-1" }, 
                    React.createElement('h1', { className: "text-lg font-black text-white tracking-tight leading-tight max-w-[70%]" }, username),
                    React.createElement('div', { className: "flex items-center gap-4" },
                        React.createElement('button', { onClick: () => setShowHelpModal(true), className: "w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors bg-white/5 active:scale-90" }, React.createElement(HelpCircle, { size: 22 })),
                        React.createElement('button', { onClick: onOpenProfile, className: "w-12 h-12 rounded-full bg-dark-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shadow-lg" }, React.createElement(User, { size: 24 }))
                    )
                ),
                
                // --- SELECTOR DE FECHA EVOLUCIONADO ---
                React.createElement('div', { className: "flex flex-col gap-3 mb-2" },
                    // Navegación
                    React.createElement('div', { className: "flex items-center justify-between px-2" },
                        React.createElement('button', { onClick: prevMonth, className: "p-2 text-gray-400 hover:text-white transition-colors active:scale-90 bg-white/5 rounded-full" }, React.createElement(ChevronLeft, { size: 24 })),
                        React.createElement('span', { className: "text-xl font-bold text-white tracking-tight" }, viewMode === 'year' ? `Año ${yearLabel}` : formattedMonth),
                        React.createElement('button', { onClick: nextMonth, className: "p-2 text-gray-400 hover:text-white transition-colors active:scale-90 bg-white/5 rounded-full" }, React.createElement(ChevronRight, { size: 24 }))
                    ),
                    
                    // Selector de Modo (Segmented Control)
                    React.createElement('div', { className: "bg-dark-surface p-1 rounded-2xl flex relative border border-white/5" },
                        React.createElement('button', { onClick: () => setViewMode('month'), className: `flex-1 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}` }, "Mes"),
                        React.createElement('button', { onClick: () => setViewMode('ytd'), className: `flex-1 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'ytd' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}` }, "Acumulado"),
                        React.createElement('button', { onClick: () => setViewMode('year'), className: `flex-1 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'year' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}` }, "Año")
                    )
                ),

                // --- NUEVA BARRA DE TASAS (Horizontal Scroll) ---
                React.createElement('div', { 
                    onClick: () => setShowRatesModal(true),
                    className: "w-full glass-panel-premium rounded-xl p-3 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar border border-white/5 active:scale-[0.98] transition-all cursor-pointer group"
                },
                    React.createElement('div', { className: "flex items-center gap-4 flex-nowrap min-w-max" },
                        React.createElement('div', { className: "flex flex-col" },
                             React.createElement('span', { className: "text-[10px] font-bold text-emerald-100/50 uppercase tracking-wider" }, "BCV $"),
                             React.createElement('span', { className: "text-sm font-bold text-white font-mono" }, rates.bcv?.toFixed(2))
                        ),
                        React.createElement('div', { className: "w-px h-6 bg-white/10" }),
                        React.createElement('div', { className: "flex flex-col" },
                             React.createElement('span', { className: "text-[10px] font-bold text-emerald-100/50 uppercase tracking-wider" }, "USDC"),
                             React.createElement('span', { className: "text-sm font-bold text-emerald-400 font-mono" }, rates.parallel?.toFixed(2))
                        ),
                        React.createElement('div', { className: "w-px h-6 bg-white/10" }),
                        React.createElement('div', { className: "flex flex-col" },
                             React.createElement('span', { className: "text-[10px] font-bold text-emerald-100/50 uppercase tracking-wider" }, "BCV €"),
                             React.createElement('span', { className: "text-sm font-bold text-blue-400 font-mono" }, rates.eur?.toFixed(2) || 0)
                        )
                    ),
                    React.createElement(RefreshCw, { size: 16, className: "text-emerald-500 opacity-80 shrink-0 group-hover:rotate-180 transition-transform duration-500" })
                ),

                // CARD PRINCIPAL - AHORA CON ACCESO AL REPORTE
                React.createElement('div', { 
                    onClick: onOpenReport,
                    className: "relative w-full h-auto rounded-[2.5rem] p-5 overflow-hidden group shadow-neon transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]" 
                },
                    React.createElement('div', { className: "absolute inset-0 bg-card-gradient" }),
                    
                    React.createElement('div', { className: "relative z-10 flex flex-col items-center text-center py-2" },
                        React.createElement('div', { className: "flex flex-col items-center justify-center mb-2" },
                             React.createElement('span', { className: "text-xs text-emerald-100/80 font-bold uppercase tracking-widest" }, 
                                viewMode === 'ytd' ? "BALANCE ACUMULADO" : (viewMode === 'year' ? "BALANCE ANUAL" : "BALANCE NETO")
                             ),
                        ),
                        React.createElement('h2', { className: "text-5xl font-black text-white tracking-tighter mb-1 drop-shadow-lg" }, `$${dashboardData.balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`),
                        
                        React.createElement('div', { className: "mt-3 flex items-center gap-1.5 text-emerald-100/70 group-hover:text-white transition-colors" },
                            React.createElement('span', { className: "text-[10px] font-bold uppercase tracking-wider" }, "Ver Reporte Detallado"),
                            React.createElement(FileSpreadsheet, { size: 12 })
                        )
                    )
                ),
                
                // KPI GRID - AHORA INTERACTIVO Y CON DESGLOSE
                React.createElement('div', { className: "grid grid-cols-2 gap-3" },
                    // Ingresos
                    renderKPI("Ingresos", dashboardData.ingresos, dashboardData.ingresosVES, dashboardData.ingresosHard, React.createElement(TrendingUp, { size: 14 }), "text-white", "bg-emerald-500/10 text-emerald-400", "ingresos"),
                    
                    // Gastos fijos
                    renderKPI("Gastos Fijos", dashboardData.gastosFijos, dashboardData.gastosFijosVES, dashboardData.gastosFijosHard, React.createElement(CreditCard, { size: 14 }), "text-white", "bg-orange-500/10 text-orange-400", "gastos"),

                    // Ahorro
                    renderKPI("Ahorro", dashboardData.ahorro, dashboardData.ahorroVES, dashboardData.ahorroHard, React.createElement(PiggyBank, { size: 14 }), "text-white", "bg-blue-500/10 text-blue-400", "ahorro", true),

                    // Gastos variables
                    renderKPI("Gastos Variables", dashboardData.gastosVariables, dashboardData.gastosVariablesVES, dashboardData.gastosVariablesHard, React.createElement(TrendingDown, { size: 14 }), "text-white", "bg-rose-500/10 text-rose-400", "gastos")
                ),

                // NOTA: Se eliminó el botón de "Reportes Detallados" separado para limpiar la UI y dar espacio a futuras métricas.
                // El acceso al reporte ahora está en la tarjeta principal.

                showRatesModal && React.createElement(RatesModal, { onClose: () => setShowRatesModal(false), rates }),
                showHelpModal && React.createElement(IntroModal, { onClose: handleCloseHelp })
            );
        };

        const HistoryView = ({ transactions, onEditTransaction, rates, initialFilter = "all" }) => {
             const [currentDate, setCurrentDate] = useState(new Date());
             const [selectedSegment, setSelectedSegment] = useState(initialFilter); // Filter by Type (All, Income, Expense, Savings)
             
             // Update segment when initialFilter changes from parent navigation
             useEffect(() => {
                 setSelectedSegment(initialFilter);
             }, [initialFilter]);

             const filteredTransactions = useMemo(() => {
                 return transactions.filter(t => {
                     if (!t.date) return false;
                     const tDate = new Date(t.date);
                     if (isNaN(tDate.getTime())) return false;
                     const matchDate = tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
                     if (!matchDate) return false;
                     
                     // Segment Filter
                     if (selectedSegment === "ingresos" && t.segment !== "ingresos") return false;
                     if (selectedSegment === "ahorro" && t.segment !== "ahorro") return false;
                     if (selectedSegment === "gastos" && t.segment !== "gastos_fijos" && t.segment !== "gastos_variables") return false;

                     return true;
                 }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             }, [transactions, currentDate, selectedSegment]);

             const prevMonth = () => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() - 1); setCurrentDate(newDate); };
             const nextMonth = () => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() + 1); setCurrentDate(newDate); };
             const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
             const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

             return React.createElement('div', { className: "px-6 pb-32 space-y-4 animate-fade-in", style: { paddingTop: "calc(env(safe-area-inset-top) + 24px)" } }, 
                React.createElement('div', { className: "flex justify-between items-center" },
                    React.createElement('h2', { className: "text-2xl font-black text-white tracking-tight" }, "Movimientos"),
                    React.createElement('div', { className: "flex items-center gap-1 bg-dark-card p-1.5 rounded-xl border border-white/10 shadow-inner-light" },
                        React.createElement('button', { onClick: prevMonth, className: "p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors" }, React.createElement(ChevronLeft, { size: 18 })),
                        React.createElement('span', { className: "text-xs font-bold text-white uppercase min-w-[90px] text-center" }, capitalizeFirst(monthLabel)),
                        React.createElement('button', { onClick: nextMonth, className: "p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors" }, React.createElement(ChevronRight, { size: 18 }))
                    )
                ),
                
                // --- SEGMENT FILTER (TABS) ---
                React.createElement('div', { className: "flex p-1 bg-dark-surface rounded-xl border border-white/5 overflow-x-auto no-scrollbar" },
                    [{id: 'all', l: 'Todos'}, {id: 'ingresos', l: 'Ingresos'}, {id: 'gastos', l: 'Gastos'}, {id: 'ahorro', l: 'Ahorro'}].map(opt => 
                        React.createElement('button', { 
                            key: opt.id,
                            onClick: () => setSelectedSegment(opt.id),
                            className: `flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedSegment === opt.id ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`
                        }, opt.l)
                    )
                ),


                filteredTransactions.length === 0 ? 
                    React.createElement('div', { className: "text-center py-12 text-gray-500 bg-dark-surface/30 rounded-3xl border border-white/5 border-dashed" }, "No hay movimientos con este filtro") :
                    React.createElement('div', { className: "space-y-3" }, filteredTransactions.map(t => {
                        const isVesSaving = t.segment === 'ahorro' && t.currency === 'VES';
                        let devaluation = 0;
                        if (isVesSaving && rates.bcv && t.originalRate) {
                            devaluation = ((t.originalRate / rates.bcv) - 1) * 100;
                        }

                        return React.createElement('div', { 
                            key: t.id, 
                            onClick: () => onEditTransaction(t), 
                            className: `glass-panel-premium p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all relative overflow-hidden ${isVesSaving ? 'border-red-500/40 shadow-danger' : ''}` 
                        }, 
                        isVesSaving && React.createElement('div', { className: "absolute inset-0 bg-danger-gradient opacity-20 pointer-events-none" }),
                        
                        React.createElement('div', { className: "flex gap-3 items-center relative z-10" }, 
                            React.createElement('div', { className: `w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}` }, 
                                 t.type === 'income' ? React.createElement(ArrowDownLeft, { size: 18 }) : React.createElement(ArrowUpRight, { size: 18 })
                            ),
                            React.createElement('div', { className: "flex flex-col" }, 
                                React.createElement('span', { className: "font-bold text-white text-base leading-tight" }, t.category), 
                                React.createElement('div', { className: "flex items-center gap-2 mt-0.5" },
                                    React.createElement('span', { className: "text-xs text-gray-400 font-medium" }, t.description || new Date(t.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })),
                                    isVesSaving && devaluation < -0.1 && React.createElement('span', { className: "bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 flex items-center gap-1" }, 
                                        React.createElement(TrendingDown, { size: 10 }), 
                                        `${devaluation.toFixed(0)}% Val.`
                                    )
                                )
                            )
                        ), 
                        React.createElement('div', { className: "text-right relative z-10" }, 
                            React.createElement('span', { className: `block font-bold text-lg ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}` }, `${t.type === 'income' ? '+' : '-'}${(t.amountUSD || 0).toFixed(2)}`), 
                            React.createElement('span', { className: "text-xs text-gray-500 font-mono font-bold bg-black/30 px-1.5 py-0.5 rounded ml-auto w-fit block mt-1" }, 
                                t.currency === 'USD' ? 'USD' : (t.currency === 'EUR' ? `€ ${t.amount}` : `Bs ${t.amount}`)
                            )
                        )
                    );
                }))
            );
        };
        
        const PnLReportView = ({ transactions, pnlStructure, rates }) => {
            const [granularity, setGranularity] = useState('monthly');
            const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return getLocalDateString(d); });
            const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return getLocalDateString(d); });
            const [isFullScreen, setIsFullScreen] = useState(false);
            const [zoomLevel, setZoomLevel] = useState(1);

            const toggleFullScreen = () => { setIsFullScreen(!isFullScreen); if (!isFullScreen) setZoomLevel(1); };
            const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
            const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

            const periods = useMemo(() => { const start = new Date(startDate + "T12:00:00"); const end = new Date(endDate + "T12:00:00"); const periodsArr = []; let current = new Date(start); let loopCount = 0; while (current <= end && loopCount < 1000) { let label = "", id = ""; if (granularity === 'daily') { id = current.toISOString().split('T')[0]; label = current.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); current.setDate(current.getDate() + 1); } else if (granularity === 'weekly') { id = current.toISOString().split('T')[0]; label = `${current.getDate()}/${current.getMonth()+1}`; current.setDate(current.getDate() + 7); } else if (granularity === 'monthly') { id = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`; label = current.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }); current.setDate(1); current.setMonth(current.getMonth() + 1); } else if (granularity === 'yearly') { id = `${current.getFullYear()}`; label = `${current.getFullYear()}`; current.setFullYear(current.getFullYear() + 1); } periodsArr.push({ id, label }); loopCount++; } return periodsArr; }, [startDate, endDate, granularity]);
            
            const reportData = useMemo(() => { 
                const data = { net: {}, available: {}, flexibleAvailable: {} }; 
                const segments = ['ingresos', 'gastos_fijos', 'gastos_variables', 'ahorro']; 
                
                // Inicializamos los totales por segmento
                segments.forEach(seg => { 
                    data[seg] = { concepts: {}, total: {} }; 
                    // No pre-llenamos conceptos para permitir la creación dinámica por moneda
                    periods.forEach(p => data[seg].total[p.id] = 0); 
                }); 
                
                periods.forEach(p => { data.net[p.id] = 0; data.available[p.id] = 0; data.flexibleAvailable[p.id] = 0; }); 
                
                transactions.forEach(t => { 
                    const tDateStr = t.date.split('T')[0]; 
                    if (tDateStr < startDate || tDateStr > endDate) return; 
                    
                    let pId = ""; 
                    if (granularity === 'daily') pId = tDateStr; 
                    else if (granularity === 'monthly') pId = tDateStr.substring(0, 7); 
                    else if (granularity === 'yearly') pId = tDateStr.substring(0, 4); 
                    else if (granularity === 'weekly') { 
                        const tTime = new Date(tDateStr + "T12:00:00").getTime(); 
                        const period = periods.find(p => { const pDate = new Date(p.id + "T12:00:00"); const nextPDate = new Date(pDate); nextPDate.setDate(nextPDate.getDate() + 7); return tTime >= pDate.getTime() && tTime < nextPDate.getTime(); }); 
                        if (period) pId = period.id; 
                    } 
                    
                    if (pId && data[t.segment]) { 
                        let amount = t.amountUSD || 0; 
                        
                        if (t.segment === 'ahorro' && t.currency === 'VES' && rates.bcv > 0) {
                            amount = t.amount / rates.bcv;
                        }

                        // CREACIÓN DE LLAVE DINÁMICA POR MONEDA
                        const currencyLabel = t.currency === 'VES' ? 'Bs' : (t.currency === 'USD' ? 'USD' : 'EUR');
                        const conceptKey = `${t.category} (${currencyLabel})`;

                        if (!data[t.segment].concepts[conceptKey]) { 
                            data[t.segment].concepts[conceptKey] = {}; 
                            periods.forEach(p => data[t.segment].concepts[conceptKey][p.id] = 0); 
                        } 
                        
                        if (data[t.segment].concepts[conceptKey][pId] !== undefined) {
                            data[t.segment].concepts[conceptKey][pId] += amount; 
                        }

                        data[t.segment].total[pId] += amount; 
                        
                        if (SEGMENTS[t.segment].type === 'income') data.net[pId] += amount; else data.net[pId] -= amount; 
                    } 
                }); 

                periods.forEach(p => { if(!p.id) return; const totalIncome = data.ingresos.total[p.id] || 0; const totalSavings = data.ahorro.total[p.id] || 0; const totalFixed = data.gastos_fijos.total[p.id] || 0; data.available[p.id] = totalIncome - totalSavings; data.flexibleAvailable[p.id] = totalIncome - totalSavings - totalFixed; }); 
                return data; 
            }, [transactions, periods, granularity, startDate, endDate, pnlStructure, rates]);

            const renderTableContent = () => (
                React.createElement('table', { className: "pnl-table border-collapse" },
                    React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', { className: "pnl-cell-head pnl-col-sticky" }, ""), periods.map(p => React.createElement('th', { key: p.id, className: "pnl-cell-head min-w-[80px]" }, p.label)))),
                    React.createElement('tbody', null,
                        ['ingresos', 'ahorro'].map(seg => React.createElement(React.Fragment, { key: seg }, 
                            React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-group-header" }, SEGMENTS[seg].label.toUpperCase()), periods.map(p => React.createElement('td', { key: p.id, className: "pnl-cell pnl-row-group-header" }))), 
                            Object.entries(reportData[seg].concepts).map(([concept, values]) => React.createElement('tr', { key: concept }, React.createElement('td', { className: "pnl-cell pnl-col-sticky text-gray-400 pl-4 text-xs" }, concept), periods.map(p => React.createElement('td', { key: p.id, className: "p-4 text-right text-gray-300 border-b border-white/5" }, values[p.id] === 0 ? '-' : Math.round(values[p.id]).toLocaleString())))), 
                            React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-total text-white" }, `Total ${SEGMENTS[seg].label}`), periods.map(p => React.createElement('td', { key: p.id, className: "pnl-cell pnl-row-total" }, Math.round(reportData[seg].total[p.id]).toLocaleString()))))
                        ),
                        React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-available" }, "DISPONIBLE"), periods.map(p => React.createElement('td', { key: p.id, className: "pnl-cell pnl-row-available" }, Math.round(reportData.available[p.id]).toLocaleString()))),
                        React.createElement(React.Fragment, { key: 'gastos_fijos' }, 
                            React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-group-header" }, SEGMENTS['gastos_fijos'].label.toUpperCase()), periods.map(p => React.createElement('td', { key: p.id, className: "pnl-cell pnl-row-group-header" }))), 
                            Object.entries(reportData['gastos_fijos'].concepts).map(([concept, values]) => React.createElement('tr', { key: concept }, React.createElement('td', { className: "pnl-cell pnl-col-sticky text-gray-400 pl-4 text-xs" }, concept), periods.map(p => React.createElement('td', { key: p.id, className: "p-4 text-right text-gray-300 border-b border-white/5" }, values[p.id] === 0 ? '-' : Math.round(values[p.id]).toLocaleString())))), 
                            React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-total text-white" }, `Total ${SEGMENTS['gastos_fijos'].label}`), periods.map(p => React.createElement('td', { key: p.id, className: "p-4 bg-dark-card text-right font-bold text-brand border-b border-white/10" }, Math.round(reportData['gastos_fijos'].total[p.id]).toLocaleString())))
                        ),
                        React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-flexible" }, "DISP. FLEXIBLE"), periods.map(p => React.createElement('td', { key: p.id, className: "p-4 bg-purple-500/10 text-right font-bold text-purple-400 border-b border-white/10" }, Math.round(reportData.flexibleAvailable[p.id]).toLocaleString()))),
                        React.createElement(React.Fragment, { key: 'gastos_variables' }, 
                            React.createElement('tr', null, React.createElement('td', { className: "p-4 bg-dark-surface/50 font-bold text-white border-b border-white/5" }, SEGMENTS['gastos_variables'].label.toUpperCase()), periods.map(p => React.createElement('td', { key: p.id, className: "p-4 bg-dark-surface/50 border-b border-white/5" }))), 
                            Object.entries(reportData['gastos_variables'].concepts).map(([concept, values]) => React.createElement('tr', { key: concept }, React.createElement('td', { className: "pnl-cell pnl-col-sticky text-gray-400 pl-4 text-xs" }, concept), periods.map(p => React.createElement('td', { key: p.id, className: "p-4 text-right text-gray-300 border-b border-white/5" }, values[p.id] === 0 ? '-' : Math.round(values[p.id]).toLocaleString())))), 
                            React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-total text-white" }, `Total ${SEGMENTS['gastos_variables'].label}`), periods.map(p => React.createElement('td', { key: p.id, className: "pnl-cell pnl-row-total" }, Math.round(reportData['gastos_variables'].total[p.id]).toLocaleString())))
                        ),
                        React.createElement('tr', null, React.createElement('td', { className: "pnl-cell pnl-col-sticky pnl-row-net" }, "RESULTADO NETO"), periods.map(p => React.createElement('td', { key: p.id, className: `pnl-cell pnl-row-net ${reportData.net[p.id] < 0 ? 'text-red-500' : 'text-emerald-400'}` }, Math.round(reportData.net[p.id]).toLocaleString())))
                    )
                )
            );

            if (isFullScreen) {
                return React.createElement('div', { className: "fixed inset-0 z-50 bg-dark-base flex flex-col h-full w-full animate-fade-in" },
                    React.createElement('div', { className: "flex justify-between items-center px-4 pb-4 pt-14 bg-dark-surface border-b border-white/10 z-20 shadow-xl" },
                         React.createElement('h2', { className: "text-lg font-bold text-white flex items-center gap-2" }, React.createElement(FileSpreadsheet, {size:20}), "Vista Exploración"),
                         React.createElement('button', { onClick: toggleFullScreen, className: "p-3 bg-dark-highlight rounded-full text-white hover:bg-white/20 active:scale-90 transition-transform" }, React.createElement(Minimize2, { size: 24 }))
                    ),
                    React.createElement('div', { className: "flex-1 overflow-auto bg-dark-base relative" },
                         React.createElement('div', { className: "p-4 min-w-max transition-transform origin-top-left", style: { transform: `scale(${zoomLevel})` } }, 
                            renderTableContent()
                        )
                    ),
                    React.createElement('div', { className: "zoom-controls" },
                        React.createElement('button', { onClick: handleZoomIn, className: "w-12 h-12 bg-white text-black rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform" }, React.createElement(ZoomIn, { size: 24 })),
                        React.createElement('button', { onClick: handleZoomOut, className: "w-12 h-12 bg-white text-black rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform" }, React.createElement(ZoomOut, { size: 24 })),
                        React.createElement('div', { className: "bg-black/80 px-2 py-1 rounded text-xs text-center font-bold" }, `${Math.round(zoomLevel * 100)}%`)
                    )
                );
            }

            return React.createElement('div', { className: "h-full flex flex-col bg-app-bg animate-fade-in", style: { paddingTop: "calc(env(safe-area-inset-top) + 24px)" } },
                React.createElement('div', { className: "px-6 mb-4 flex justify-between items-end" },
                    React.createElement('h2', { className: "text-2xl font-black text-white tracking-tight" }, "Reporte"),
                    React.createElement('button', { onClick: toggleFullScreen, className: "p-3 bg-card-gradient rounded-xl shadow-neon text-white" }, React.createElement(Maximize2, { size: 20 }))
                ),
                React.createElement('div', { className: "px-6" },
                    React.createElement('div', { className: "glass-panel-premium p-5 rounded-3xl flex flex-col gap-4 mt-0 mb-4" },
                        React.createElement('div', { className: "w-full" },
                            React.createElement('label', { className: "text-[10px] text-gray-400 font-bold uppercase ml-2 mb-1 block" }, "Agrupar por"),
                            React.createElement('div', { className: "relative" },
                                React.createElement('select', { value: granularity, onChange: e => setGranularity(e.target.value), className: "w-full appearance-none bg-dark-base border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-brand/50 transition-all" }, 
                                    React.createElement('option', { value: "daily" }, "Diario"), React.createElement('option', { value: "weekly" }, "Semanal"), React.createElement('option', { value: "monthly" }, "Mensual"), React.createElement('option', { value: "yearly" }, "Anual")
                                ),
                                React.createElement(ChevronDown, { size: 16, className: "absolute right-3 top-3.5 text-gray-500 pointer-events-none" })
                            )
                        ),
                        React.createElement('div', { className: "grid grid-cols-2 gap-3 w-full" },
                             React.createElement('div', { className: "min-w-0" },
                                React.createElement('label', { className: "text-[10px] text-gray-400 font-bold uppercase ml-2 mb-1 block" }, "Desde"),
                                React.createElement('input', { type: "date", value: startDate, onChange: e => setStartDate(e.target.value), className: "w-full bg-dark-base border border-white/10 text-white rounded-xl px-2 py-3 text-xs font-bold outline-none text-center appearance-none" })
                            ),
                             React.createElement('div', { className: "min-w-0" },
                                React.createElement('label', { className: "text-[10px] font-bold uppercase ml-2 mb-1 block" }, "Hasta"),
                                React.createElement('input', { type: "date", value: endDate, onChange: e => setEndDate(e.target.value), className: "w-full bg-dark-base border border-white/10 text-white rounded-xl px-2 py-3 text-xs font-bold outline-none text-center appearance-none" })
                            )
                        )
                    )
                ),
                React.createElement('div', { className: "flex-1 overflow-auto bg-app-bg pnl-table-container pb-36" }, 
                    renderTableContent()
                )
            );
        };

        const App = () => {
            const [user, setUser] = useState(null);
            const [authLoading, setAuthLoading] = useState(true);
            const [rates, setRates] = useState({ bcv: 0, parallel: 0, eur: 0, eurCross: 0 });
            const [transactions, setTransactions] = useState([]);
            const [pnlStructure, setPnlStructure] = useState(DEFAULT_PNL);
            const [budgets, setBudgets] = useState({});
            const [showTransactionModal, setShowTransactionModal] = useState(false);
            const [currentTab, setCurrentTab] = useState('home');
            const [editingTransaction, setEditingTransaction] = useState(null);
            const [historyFilter, setHistoryFilter] = useState('all');

            useEffect(() => { 
                const unsubscribe = onAuthStateChanged(auth, (u) => {
                    setUser(u);
                    setAuthLoading(false);
                });
                return () => unsubscribe(); 
            }, []);

            useEffect(() => {
                if (!user || !db) return;
                const userRef = doc(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid);
                const unsubRates = onSnapshot(doc(userRef, 'settings', 'rates'), (d) => { if (d.exists()) setRates(d.data()); });
                const unsubPnl = onSnapshot(doc(userRef, 'settings', 'pnl'), (d) => { if (d.exists()) setPnlStructure(d.data()); else setDoc(doc(userRef, 'settings', 'pnl'), DEFAULT_PNL); });
                const unsubBudgets = onSnapshot(doc(userRef, 'settings', 'budgets'), (d) => { if (d.exists()) setBudgets(d.data()); });
                const unsubTrans = onSnapshot(query(collection(userRef, 'transactions')), (s) => setTransactions(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
                
                getRatesFromAPI().then(async (r) => { 
                    if (r?.bcv) try { 
                        await setDoc(doc(userRef, 'settings', 'rates'), r, { merge: true }); 
                    } catch(e) {} 
                });
                return () => { unsubRates(); unsubTrans(); unsubPnl(); unsubBudgets(); };
            }, [user]);

            const updateRates = async (r) => { if(!user) return; await setDoc(doc(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid, 'settings', 'rates'), { bcv: parseFloat(r.bcv), parallel: parseFloat(r.parallel), eur: parseFloat(r.eur || 0), eurCross: parseFloat(r.eurCross || 0) }); };
            const updatePnl = async (p) => { if(!user) return; await setDoc(doc(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid, 'settings', 'pnl'), p); };
            const updateBudgets = async (b) => { if(!user) return; await setDoc(doc(db, ROOT_COLLECTION, PROJECT_DOC_ID, 'users', user.uid, 'settings', 'budgets'), b); };
            const handleEditTransaction = (tx) => { setEditingTransaction(tx); setShowTransactionModal(true); };
            const handleCloseModal = () => { setShowTransactionModal(false); setEditingTransaction(null); };
            
            const handleNavigateToHistory = (filterType) => {
                setHistoryFilter(filterType);
                setCurrentTab('history');
            };

            if (authLoading) {
                return React.createElement('div', { className: "h-screen w-full bg-app-bg flex flex-col items-center justify-center animate-fade-in" },
                    React.createElement('div', { className: "w-20 h-20 bg-card-gradient rounded-3xl rotate-3 flex items-center justify-center shadow-neon mb-6 animate-pulse" },
                        React.createElement(Wallet, { size: 40, className: "text-white" })
                    ),
                    React.createElement(Loader2, { size: 32, className: "animate-spin text-brand" })
                );
            }

            if (!user) return React.createElement(LoginScreen);

            return React.createElement(ErrorBoundary, null, 
                React.createElement('div', { className: "h-screen w-full bg-app-bg flex flex-col text-white" },
                    React.createElement('div', { className: "flex-1 overflow-y-auto no-scrollbar" },
                        currentTab === 'home' ? React.createElement(HomeView, { rates, transactions, onUpdateRate: updateRates, onOpenReport: () => setCurrentTab('report'), onEditTransaction: handleEditTransaction, user, onOpenProfile: () => setCurrentTab('profile'), onNavigateToHistory: handleNavigateToHistory }) :
                        currentTab === 'history' ? React.createElement(HistoryView, { transactions, onEditTransaction: handleEditTransaction, rates, initialFilter: historyFilter }) :
                        currentTab === 'report' ? React.createElement(PnLReportView, { transactions, pnlStructure, rates }) : 
                        currentTab === 'budget' ? React.createElement(BudgetView, { pnlStructure, budgets, onUpdateBudgets: updateBudgets, transactions }) :
                        currentTab === 'config' ? React.createElement(ConfigView, { pnlData: pnlStructure, onUpdatePnl: updatePnl, userId: user.uid }) :
                        currentTab === 'profile' ? React.createElement(ProfileView, { user, onBack: () => setCurrentTab('home'), onLogout: () => signOut(auth) }) : null
                    ),
                    currentTab !== 'profile' && React.createElement('nav', { className: "glass-panel-premium border-t-0 rounded-t-[2rem] safe-bottom px-6 py-3 flex justify-between items-center fixed bottom-0 w-full shadow-2xl z-30" },
                        React.createElement('button', { onClick: () => setCurrentTab('home'), className: `p-2 ${currentTab === 'home' ? 'text-brand' : 'text-gray-500'}` }, React.createElement(Home, { size: 24, strokeWidth: currentTab === 'home' ? 3 : 2 })),
                        React.createElement('button', { onClick: () => setCurrentTab('budget'), className: `p-2 ${currentTab === 'budget' ? 'text-brand' : 'text-gray-500'}` }, React.createElement(PieChart, { size: 24, strokeWidth: currentTab === 'budget' ? 3 : 2 })),

                        React.createElement('button', {
                            onClick: () => setShowTransactionModal(true),
                            className: "w-14 h-14 bg-brand rounded-full flex items-center justify-center text-black fab-shadow -mt-8 mb-1 transition-transform active:scale-90"
                        }, React.createElement(Plus, { size: 32, strokeWidth: 3 })),

                        React.createElement('button', { onClick: () => setCurrentTab('history'), className: `p-2 ${currentTab === 'history' ? 'text-brand' : 'text-gray-500'}` }, React.createElement(History, { size: 24, strokeWidth: currentTab === 'history' ? 3 : 2 })),
                        React.createElement('button', { onClick: () => setCurrentTab('config'), className: `p-2 ${currentTab === 'config' ? 'text-brand' : 'text-gray-500'}` }, React.createElement(Settings, { size: 24, strokeWidth: currentTab === 'config' ? 3 : 2 }))
                    ),
                    showTransactionModal && React.createElement(TransactionModal, { onClose: handleCloseModal, rates, userId: user.uid, pnlStructure, initialData: editingTransaction, projectDocId: PROJECT_DOC_ID })
                )
            );
        };

        const root = createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>

=== FIN CODIGO WEB SENCILLO (BASELINE) ===
```
