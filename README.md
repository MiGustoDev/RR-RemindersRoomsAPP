<div align="center">

  <h1>✨ Reminders & Rooms (RR)</h1>
  <p><b>Plataforma interna de gestión inteligente de recordatorios compartidos por salas para Mi Gusto</b></p>

  <p>
    <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" />
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" />
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-%233ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white" />
  </p>

</div>

---

## 🚀 Visión General

**Reminders & Rooms** es una aplicación colaborativa diseñada para optimizar la organización y seguimiento de tareas en equipo. Permite gestionar salas virtuales (*rooms*) independientes, delegar recordatorios a personas específicas, definir prioridades, monitorear fechas límite y analizar la productividad mediante múltiples vistas interactivas (Tarjetas, Calendario y Diagrama de Gantt).

---

## ✨ Funcionalidades Destacadas

- 🔐 **Autenticación & Seguridad Avanzada**: Gestión de sesiones en tiempo real integrada con **Supabase Auth**, manejo granular de errores de acceso y persistencia segura.
- 🏢 **Salas Colaborativas (Rooms)**: Creación de salas privadas o públicas con códigos de acceso únicos, control de miembros y sincronización en tiempo real vía WebSockets.
- 📋 **Gestión Integral de Tareas**:
  - Filtros avanzados por estado (activos, vencidos, hoy, semana), prioridad, etiquetas y personas asignadas.
  - Asignación inteligente a miembros con notificaciones instantáneas mediante **EmailJS**.
- 📊 **Múltiples Vistas Interactivas**:
  - **Vista de Tarjetas**: Flujo dinámico y visual para trabajo diario.
  - **Vista de Calendario**: Planificación temporal ordenada y clara.
  - **Diagrama de Gantt**: Cronograma interactivo de dependencias y tiempos.
- 📈 **Analítica & Panel de Estadísticas**: Métricas en tiempo real sobre la carga de trabajo del equipo y tasa de finalización de tareas.
- 🌙 **Modo Oscuro & Experiencia Fluida**: Interfaz moderna adaptable a temas claro/oscuro con atajos de teclado intuitivos (`Ctrl+K`, `Ctrl+N`, `Ctrl+,`).

---

## 🖼️ Galería de Imágenes

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <img src="src/screenshots/Screenshot_1.png" alt="Panel Principal y Gestión de Salas" width="100%"/>
      <br/>
      <sub><b>Panel Principal & Salas Colaborativas</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="src/screenshots/Screenshot_2.png" alt="Control de Tareas y Filtros" width="100%"/>
      <br/>
      <sub><b>Control de Tareas & Filtros Avanzados</b></sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="src/screenshots/Screenshot_3.png" alt="Vista en Calendario" width="100%"/>
      <br/>
      <sub><b>Vista en Calendario & Programación</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="src/screenshots/Screenshot_4.png" alt="Estadísticas y Diagrama de Gantt" width="100%"/>
      <br/>
      <sub><b>Diagrama de Gantt & Panel de Métricas</b></sub>
    </td>
  </tr>
</table>

---

## 🛠️ Stack Tecnológico

- **Core & UI**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilos & Diseño**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (iconografía)
- **Visualización**: [Frappe Gantt](https://github.com/frappe/gantt) (diagramas cronológicos)
- **Backend & Realtime**: [Supabase](https://supabase.com/) (Auth, PostgreSQL Database & Realtime Channels)
- **Notificaciones**: [EmailJS](https://www.emailjs.com/) (Emailing automatizado)

---

## 👥 Equipo de Desarrollo

<div align="center">

| Desarrollador | Enlaces |
| :--- | :--- |
| **Facundo Carrizo** | [![GitHub](https://img.shields.io/badge/GitHub-Facu14carrizo-181717?logo=github)](https://github.com/Facu14carrizo) [![LinkedIn](https://img.shields.io/badge/LinkedIn-Perfil-0A66C2?logo=linkedin)](https://www.linkedin.com/in/facu14carrizo/) |
| **Ramiro Lacci** | [![GitHub](https://img.shields.io/badge/GitHub-ramirolacci-181717?logo=github)](https://github.com/ramirolacci) [![LinkedIn](https://img.shields.io/badge/LinkedIn-Perfil-0A66C2?logo=linkedin)](https://www.linkedin.com/in/ramiro-lacci/) |

</div>
