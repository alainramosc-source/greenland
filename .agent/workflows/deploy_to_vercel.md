---
description: Guía paso a paso para desplegar en Vercel desde GitHub
---

# Despliegue en Vercel

Sigue estos pasos para poner tu sitio web en línea:

1.  **Inicia Sesión en Vercel**:
    *   Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.

2.  **Importar Proyecto**:
    *   En tu dashboard, haz clic en **"Add New..."** > **"Project"**.
    *   Verás una lista de tus repositorios de GitHub. Busca `greenland` y haz clic en **"Import"**.

3.  **Configurar Proyecto**:
    *   **Project Name**: Dejar como está o cambiar a `greenland-products`.
    *   **Framework Preset**: Debería detectar automáticamente **Next.js**.
    *   **Root Directory**: ¡Importante! Haz clic en "Edit" y selecciona la carpeta **`next-app`**, ya que ahí está tu aplicación Next.js. Si no lo haces, el despliegue fallará.

4.  **Variables de Entorno**:
    *   Despliega la sección **"Environment Variables"**.
    *   Copia y pega las siguientes variables desde tu archivo `.env.local`:
        *   `NEXT_PUBLIC_SUPABASE_URL`: `https://kjctnobogzpjxpwzmkwm.supabase.co`
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE`
    
5.  **Deploy**:
    *   Haz clic en **"Deploy"**.
    *   Espera unos minutos mientras Vercel construye tu sitio.

6.  **¡Listo!**:
    *   Una vez terminado, verás una pantalla de felicitación con el enlace a tu sitio en vivo (ej. `greenland-products.vercel.app`).
