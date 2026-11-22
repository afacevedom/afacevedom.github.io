# Engineering.Lab — Portafolio profesional

Sitio estático multipágina, responsive y compatible con **GitHub Pages**. No requiere Node.js, backend, base de datos ni proceso de compilación.

## Estructura

```text
portfolio_ingenieria/
├── index.html
├── pages/
│   ├── perfil.html
│   ├── arquitectura.html
│   ├── cloud-devops.html
│   ├── desarrollo.html
│   ├── datos-ia.html
│   ├── experiencia.html
│   ├── proyectos.html
│   ├── tecnologias.html
│   ├── certificaciones.html
│   ├── contacto.html
│   └── lab.html
└── assets/
    ├── css/styles.css
    ├── js/main.js
    └── favicon.svg
```

## Publicar en GitHub Pages

1. Crea un repositorio público en GitHub, por ejemplo `portfolio`.
2. Descomprime este proyecto y sube **el contenido** de la carpeta a la raíz del repositorio.
3. En GitHub abre **Settings → Pages**.
4. En **Build and deployment**, selecciona `Deploy from a branch`.
5. Elige `main` y `/ (root)`, guarda y espera la publicación.
6. Tu sitio quedará disponible en `https://TU-USUARIO.github.io/portfolio/`.

También puedes usar un repositorio llamado `TU-USUARIO.github.io` para publicarlo en la raíz de tu dominio de GitHub Pages.

## Páginas incluidas

- Inicio y laboratorio retro.
- Perfil, arquitectura, Cloud & DevOps, desarrollo y Datos & IA.
- Experiencia, proyectos, tecnologías, certificaciones y contacto.

## Personalización recomendada

- Reemplaza `ENGINEERING.LAB` por la marca o nombre profesional que quieras mostrar.
- Revisa el contenido de cada archivo dentro de `pages/`.
- Agrega proyectos demostrables, capturas y diagramas en `assets/`.
- En `pages/contacto.html`, agrega solo los enlaces públicos que quieras divulgar.
- Actualiza los metadatos SEO y el año cuando corresponda.

## Privacidad y contenido

El contenido inicial evita teléfono, correo personal, ubicación y nombres de empleadores. Los textos describen áreas de experiencia y formación de manera profesional. Antes de publicar, revisa que los proyectos, diagramas y capturas no incluyan información institucional o confidencial.

## Compatibilidad

- HTML, CSS y JavaScript nativos.
- Rutas relativas para funcionar tanto en dominio raíz como en repositorio de proyecto.
- Diseño adaptable a móvil, tableta y escritorio.
- No utiliza rutas del servidor, PHP, APIs privadas ni dependencias de compilación.
- Google Fonts mejora la tipografía cuando hay conexión; el sitio conserva fuentes alternativas si no carga.
