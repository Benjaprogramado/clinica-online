# Clínica Online – Resumen Ejecutivo del Proyecto

## 1. Introducción
- **Objetivo general:** desarrollar una plataforma web para gestionar turnos, historias clínicas y estadísticas de una clínica con tres perfiles de usuario (paciente, especialista, administrador).
- **Stack principal:** Angular 17 (standalone components, señales, animaciones), Firebase (Auth, Firestore, Storage, Hosting) y librerías auxiliares (SweetAlert2, ng2-charts, jsPDF, XLSX, FileSaver).
- **Metodología:** entrega por sprints. Cada sección del documento vincula los requerimientos con su implementación para poder exponer el trabajo ante la cátedra.

## 2. Arquitectura y estructura del repositorio
```
clinica-online/
├── src/app/
│   ├── core/              # Servicios, modelos y guards reutilizables
│   ├── features/          # Módulos independientes por rol (admin, auth, paciente, especialista, landing)
│   ├── shared/            # Componentes, directivas y pipes comunes
│   ├── app.routes.ts      # Definición de rutas con carga diferida y animaciones
│   └── app.ts / app.scss  # Shell principal con overlay de loading y navbar
├── public/                # Recursos estáticos (íconos, capturas, favicon)
├── README.md              # Presentación general y guías de acceso
└── RESUMEN_PROYECTO.md    # (Este archivo) Guía completa para defensa
```

### 2.1 Capas principales
1. **Core:**
   - `core/services/` agrupa servicios como autenticación, turnos, especialidades, reportes y registro de logs.
   - `core/guards/` implementa protección por rol, verificación de email y aprobación de especialistas.
   - `core/models/` define los contratos de datos (`Usuario`, `Turno`, `HistoriaClinica`, etc.).
2. **Features:** cada carpeta es un *feature module* independiente (standalone) para un dominio específico (ej. `features/paciente`).
3. **Shared:** componentes y utilidades comunes (navbar, recaptcha, directivas de estilos, pipes de formato).
4. **Routing & Animaciones:** `app.routes.ts` asigna animaciones personalizadas (`fade`, `slideUp`). El `AppComponent` aplica las transiciones y el indicador de carga.

## 3. Herramientas y librerías destacadas
| Herramienta            | Uso en el proyecto | Ejemplo rápido |
|------------------------|--------------------|----------------|
| **Angular Signals**    | Manejo de estado reactivo en componentes. | `turnos = signal<Turno[]>([]);` en `features/paciente/mis-turnos/mis-turnos.ts`.
| **SweetAlert2**        | Diálogos consistentes para confirmaciones y formularios. | `notificationService.confirm(...)` en `features/admin/usuarios/usuarios.ts`.
| **ng2-charts / Chart.js** | Gráficos de métricas para el administrador. | `BaseChartDirective` en `features/admin/estadisticas/estadisticas.ts`.
| **Firebase Auth & Firestore** | Persistencia de usuarios, turnos y logs. | `createUserWithEmailAndPassword` en `core/services/auth.ts` (líneas 118-211 aprox.).
| **Firebase Storage**   | Subida de imágenes de perfil. | `storageService.subirImagenPerfil(...)` en `features/auth/registro-paciente/registro-paciente.ts` (líneas 115-131).
| **jsPDF + autoTable**  | Exportar historia clínica en PDF. | `reportService.exportarHistoriaClinicaPdf(...)` en `core/services/report.ts` (líneas 61-124).
| **XLSX + FileSaver**   | Exportación a Excel (usuarios, turnos). | `exportarUsuariosExcel(...)` en `core/services/report.ts` (líneas 15-33).

## 4. Recorrido por los sprints y funcionalidades
### 4.1 Sprint 1 – Acceso, registro y administración inicial
- **Landing page:** `features/landing/` ofrece CTA a login y registro.
- **Registro dual:**
  - `registro-paciente` solicita datos personales, obra social y dos fotos.
  - `registro-especialista` gestiona especialidades dinámicas (selección o alta).
  - Validaciones reactivas y verificación de contraseña definida en el propio componente (`passwordsMatchValidator`).
- **Login seguro:**
  - `core/services/auth.ts` valida verificación de email y aprobación del especialista (`login(...)` líneas ~306-417).
  - Accesos rápidos (6 usuarios de prueba) se renderizan en `features/auth/login/login.html` con carga de imágenes reales (líneas ~68-180).
- **Gestión de usuarios (Administrador):**
  - `features/admin/usuarios/usuarios.ts` lista usuarios con filtros por rol/aprobación y habilita/inhabilita mediante `UserService` (líneas ~44-140).
  - Crear nuevos usuarios reusa el backend de `AuthService.crearUsuarioDesdeAdmin(...)` para enviar emails de verificación.
- **Infraestructura mínima:** favicon en `public/favicon.ico`, despliegue en Firebase (`firebase.json`) y overlay de carga global (`app.ts` líneas 61-66).

### 4.2 Sprint 2 – Turnos y gestión operativa
- **Solicitar turno:** `features/paciente/solicitar-turno/` sigue la UX pedida (botones con imágenes, disponibilidad de 15 días sin datepicker). Utiliza `DisponibilidadService` para generar horarios compatibles con la clínica (`generarHorariosDisponibles` en `core/services/disponibilidad.ts`).
- **Mis turnos (paciente):** `mis-turnos.ts` filtra sin combobox e integra acciones condicionadas (cancelar, calificar, ver historia clínica).
- **Mis turnos (especialista):** `mis-turnos.ts` permite aceptar/rechazar/cancelar/finalizar turnos con form de historia clínica (`Swal` custom) y controles de estado.
- **Turnos (administrador):** `features/admin/turnos/turnos.ts` muestra todos los turnos con filtros avanzados y cancelación desde panel.
- **reCAPTCHA:** encapsulado en `shared/components/recaptcha/` y reutilizado en registro y solicitud de turnos.
- **README:** documenta pantallas y accesos (`README.md`).

> **Nota pendiente:** en Sprint 2 todavía debe agregarse la captura del motivo al cancelar turnos y la acción “Completar encuesta” (identificado durante el análisis).

### 4.3 Sprint 3 – Historias clínicas, descargas y animaciones
- **Historia clínica:**
  - Modelo en `core/models/turno.model.ts` (interfaz `HistoriaClinica`).
  - Persistencia al finalizar turno (`registrarHistoriaClinica(...)` en `core/services/turno.ts`, líneas ~323-387).
  - Visualización:
    - Paciente: `MiPerfilPacienteComponent` (`features/paciente/mi-perfil/mi-perfil.ts`) lista historias por especialidad y permite ver detalles via modal Swal.
    - Especialista: `PacientesAtendidosComponent` muestra cards con últimos 3 turnos por paciente (`features/especialista/pacientes/pacientes.ts`).
    - Administrador: exporta planilla Excel desde `usuarios.ts` (`descargarHistorialPaciente`).
- **Exportes obligatorios:**
  - Excel de usuarios (`ReportService.exportarUsuariosExcel`).
  - PDF historia clínica con logo y fecha (`ReportService.exportarHistoriaClinicaPdf`).
- **Animaciones de transición:** definidas en `app.ts` (`routeAnimations`) y aplicadas por rutas (`data.animation` en `app.routes.ts`).
- **Filtros globales:** búsqueda texto ahora incluye datos dinámicos de historia clínica (ver `turnosFiltrados` en componentes de paciente/especialista).

### 4.4 Sprint 4 – Pipes, directivas y analítica avanzada
- **Pipes personalizados:** ubicados en `shared/pipes/`.
  - `nombre-completo.pipe.ts`: arma el nombre completo incluso si faltan datos. Ejemplo: `{{ usuario | nombreCompleto }}` en `usuarios.html`.
  - `fecha-hora.pipe.ts`: normaliza `Timestamp` o `Date` (`{{ log.fechaIngreso | fechaHoraCorta }}` en `estadisticas.html`).
  - `porcentaje.pipe.ts`: calcula porcentaje con fallback (tarjetas de resumen en `estadisticas.html`).
  - `especialidad-imagen.pipe.ts`: resuelve íconos para especialidades (usado en `solicitar-turno.html`).
- **Directivas personalizadas:**
  - `hover-elevate.directive.ts`: eleva tarjetas al pasar el mouse (aplicada en tarjetas de usuarios y estadísticas).
  - `focus-border.directive.ts`: resalta inputs con un borde de color (rango de fechas en estadísticas).
  - `role-badge.directive.ts`: formatea visualmente el rol (`<span [appRoleBadge]="usuario.role">`).
- **Estadísticas del administrador:**
  - Componentes en `features/admin/estadisticas/`. Señales para métricas (`totalTurnos`, `promedioTurnosDia`).
  - Gráficos de barras y líneas con filtros de rango de fechas.
  - Descarga a Excel/PDF reutilizando `ReportService.exportarDatasetExcel` y `exportarTablaPdf`.
- **Logs de ingresos:** `LogService.registrarIngreso` se dispara al iniciar sesión. Las consultas (`obtenerLogs`, `obtenerLogsPorRango`) alimentan la tabla de auditoría.

## 5. Flujo de datos y seguridad
1. **Autenticación:**
   - Registro -> envío de verificación -> logout automático (`AuthService.registrarUsuario`).
   - Login -> sincronización de `emailVerificado` + validación de rol/aprobación -> logging de ingreso.
2. **Autorización:** routers protegidos con guards encadenados (`roleGuard`, `especialistaAprobadoGuard`).
3. **Persistencia:**
   - Firestore colecciones: `usuarios`, `turnos`, `disponibilidad`, `logs`, `especialidades/configuracion`.
   - Subcolecciones no usadas; la historia clínica se embebe dentro de cada turno para simplificar consultas.
4. **Storage:** fotos de perfil guardadas por UID (`StorageService.subirImagenPerfil`).
5. **Notificaciones:** `NotificationService` centraliza overlays y confirmaciones.

## 6. Casos de uso clave (resumen técnico)
| Caso | Pasos técnicos | Archivos involucrados |
|------|----------------|-----------------------|
| Alta de paciente | Form reactivo → subida de 2 imágenes → `AuthService.registrarUsuario` → verificación email → notificación → logout | `registro-paciente.ts`, `storage.ts`, `auth.ts` |
| Solicitud de turno (paciente) | Selección profesional → especialidad → disponibilidad (15 días) → reCAPTCHA → `TurnoService.crearTurno` | `solicitar-turno.ts/html`, `disponibilidad.ts`, `turno.ts` |
| Atención del especialista | Listado filtrable → aceptar/rechazar/cancelar → finalizar con formulario de historia clínica → estado `resena-pendiente` | `especialista/mis-turnos.ts`, `turno.ts` |
| Reseña del paciente | Notificación de turno pendiente → modal con calificación/comentario → `TurnoService.guardarResena` → estado `realizado` | `paciente/mis-turnos.ts`, `turno.ts` |
| Estadísticas admin | Señales con datos Firestore → datasets Chart.js → exportes Excel/PDF → filtros por rango | `admin/estadisticas.ts/html`, `report.ts` |

## 7. Lecciones aprendidas y próximos pasos
- **Buenas prácticas aplicadas:**
  - Uso de componentes standalone y señales para un estado predecible.
  - Modularización estricta por feature y capa core compartida.
  - Reutilización de servicios y directivas para mantener consistencia visual y de negocio.
- **Pendientes identificados:**
  - Capturar motivo al cancelar turno (paciente/especialista) para cumplir 100% Sprint 2.
  - Implementar “Completar encuesta” post turno.
  - Mostrar historia clínica de pacientes directamente desde la sección usuarios (no sólo exportar Excel).
- **Posibles mejoras:**
  - Refactor a `TurnoService` para usar `collectionData` en tiempo real también en listados de paciente/especialista.
  - Incorporar NgRx Signals Store si el proyecto escala.
  - Automatizar despliegue con CI/CD.

## 8. Bibliografía técnica consultada
- Documentación oficial de Angular Standalone y Signals.
- Firebase Auth/Firestore/Storage Guides.
- jsPDF y autoTable para reportes.
- Chart.js & ng2-charts para visualización.

---
**Conclusión:** el proyecto abarca toda la operatoria de la clínica, con foco en seguridad, cumplimiento de requerimientos por sprint y experiencia de usuario consistente. Este documento permite explicar los módulos, su interconexión y las decisiones técnicas tomadas para presentar el trabajo final ante el profesor.»
