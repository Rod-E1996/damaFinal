# TeleSalud — Servicios Médicos a Distancia

App móvil (Expo / React Native) para pacientes y médicos: búsqueda de médicos, citas virtuales,
recetas electrónicas, historial médico, chat en tiempo real, foro de salud y mapa de médicos.

## Requisitos
- Node.js LTS
- App **Expo Go** en el celular Android (o un emulador)
- Proyecto de Firebase con **Authentication (correo/contraseña)** y **Firestore** activos

## Puesta en marcha
1. `npm install`
2. Copia `.env.example` a `.env` y completa los valores de Firebase.
3. Publica las reglas de `firestore.rules` en Firebase > Firestore Database > Reglas.
4. (Opcional) Carga médicos de demostración: `npm run seed` (contraseña: `Medico2026`).
5. `npx expo start` y escanea el código QR con Expo Go.

## Estructura
- `src/app/` — pantallas (Expo Router). `(auth)` = login/registro; `(app)` = app autenticada.
- `src/services/` — acceso a Firebase (usuarios, citas, recetas, historial, chat, foro).
- `src/lib/` — SQLite, cifrado, validaciones, notificaciones, PDF.
- `src/components/` — componentes de interfaz reutilizables.

## Cumplimiento de requisitos
| Requisito | Implementación |
|---|---|
| Interfaz amigable y responsiva | Componentes propios, ancho máximo en tablets, accesibilidad (etiquetas, áreas táctiles de 48 px) |
| Validaciones | `src/lib/validators.js` en registro, login, citas, recetas, mediciones, foro |
| Filtros | Médicos (especialidad, ubicación, idioma, día, orden), citas, recetas, historial, foro, chats |
| Alertas y notificaciones | `Alert`, toasts, notificaciones locales (recordatorios de citas, mensajes) y push (Expo Push/FCM) |
| Firebase | Auth, Firestore en tiempo real, push |
| APIs externas | Google Maps (mapa y "cómo llegar"), Jitsi Meet (videoconsulta), geocodificación |
| SQLite | `src/lib/database.js`: historial, mediciones, caché de recetas y perfil, bitácora; sincronización con Firestore |
| Seguridad | AES-256 + HMAC en Firestore y SQLite, llave en SecureStore, consultas parametrizadas, roles paciente/médico, reglas de Firestore, bloqueo tras 5 intentos fallidos |

## Notas
- Las notificaciones **push remotas** no funcionan en Expo Go desde el SDK 53; requieren un *development build*
  (`npx expo run:android` o `eas build`). Las notificaciones locales sí funcionan en Expo Go.
- La llave de cifrado de Firestore se deriva de `EXPO_PUBLIC_ENCRYPTION_SECRET`, que va dentro de la app.
  En producción convendría gestionarla en un servidor (Cloud Functions/KMS).
