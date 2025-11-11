# Clínica Online

Aplicación web desarrollada en Angular 20 para gestionar la atención de una clínica médica. Permite a pacientes, especialistas y administradores interactuar con turnos, historias clínicas y estadísticas en un entorno moderno, responsive y seguro, respaldado por Firebase (Auth, Firestore y Storage).

## Acceso y Autenticación

- **Landing page:** página inicial con presentación general y accesos directos a registro e inicio de sesión.
(public/capturaLanding.png)
- **Registro de usuarios:** flujo diferenciado para pacientes y especialistas, con validaciones, carga de documentación y selección de especialidades.
- **Login:** autenticación con email y contraseña. Existen accesos rápidos configurados para pruebas (perfiles paciente, especialista y administrador).

## Navegación General

Tras iniciar sesión, cada usuario accede a un dashboard personalizado:

- Barra lateral con enlaces a las secciones disponibles según el rol.
- Encabezado con acceso al perfil, cambios de estado y cierre de sesión.
- Contenido central con las vistas principales del módulo activo.

## Módulos y Secciones

### Pacientes
- **Solicitar turnos:** selección guiada de profesional, especialidad, fecha y horario disponibles.
- **Mis turnos:** listado filtrable con estados (pendiente, aceptado, realizado, cancelado) y opciones para calificar, subir reseñas o cancelar.
- **Historia clínica:** visualización de atenciones pasadas con detalles cargados por los especialistas.
- **Mi perfil:** actualización de datos personales y descarga en PDF de la historia clínica por especialidad.

### Especialistas
- **Agenda de turnos:** gestión de turnos asignados con acciones de aceptar, rechazar, completar y cargar la historia clínica.
- **Pacientes atendidos:** listado de pacientes con los que tuvo al menos una consulta, incluyendo los últimos turnos y acceso rápido a sus historias clínicas.
- **Perfil profesional:** configuración de disponibilidad y especialidades, actualización de datos y documentación.

### Administradores
- **Gestión de usuarios:** alta y modificación de usuarios, habilitación de especialistas y exportación de información a Excel.
- **Solicitar turnos:** posibilidad de crear turnos en nombre de un paciente, seleccionando profesional, especialidad y horarios disponibles.
- **Logs y auditoría:** tablero con los registros de actividad relevantes para el control interno.
- **Estadísticas:** panel de métricas y gráficos sobre turnos, especialidades más demandadas y participación de usuarios.


## Ejecución Local

```bash
npm install
npm run start
```

La aplicación queda disponible en `http://localhost:4200/`. Para builds de producción utilizar `npm run build`.
Tambienn se puede consultar su versión online hosteada en Firebase https://clinica-online-56d43.web.app/
