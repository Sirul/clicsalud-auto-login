import { handlePoc } from './poc.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Ruta específica para el Experimento (Iframe POC)
    if (url.pathname === '/poc') {
      return handlePoc(request, env);
    }

    // Lógica Original / Principal (Root)
    const targetUrl = env.TARGET_URL || 'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf?opcionSeleccionada=MUMEDICACION';

    try {
      // Paso 1: Obtener ViewState y JSESSIONID inicial de la página oficial
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
        }
      });
      
      const html = await response.text();
      const match = html.match(/id="javax.faces.ViewState" value="([^"]+)"/);
      const viewState = match ? match[1] : '';

      if (!viewState) {
        return new Response('Error: No se pudo conectar con el servicio de salud (ViewState no encontrado).', {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      const setCookie = response.headers.get('Set-Cookie');
      const jsMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
      const jsessionid = jsMatch ? jsMatch[1] : null;

      // Construir URL de acción con jsessionid para vincular el ViewState obtenido
      const actionUrl = jsessionid 
        ? `https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf;jsessionid=${jsessionid}?opcionSeleccionada=MUMEDICACION`
        : targetUrl;

      // HTML con formulario auto-ejecutable (siempre ejecutamos el login)
      const formHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mis Recetas</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%232563eb%22/><path d=%22M30 35h40v40H30z%22 fill=%22white%22/><rect x=%2245%22 y=%2220%22 width=%2210%22 height=%2220%22 rx=%222%22 fill=%22%232563eb%22/><path d=%22M40 55h20M50 45v20%22 stroke=%22%232563eb%22 stroke-width=%228%22 stroke-linecap=%22round%22/></svg>">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #f8fafc; 
            color: #1e293b; 
        }
        .card { 
            text-align: center; 
            padding: 3rem; 
            background: white; 
            border-radius: 2rem; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); 
            max-width: 440px; 
            width: 90%; 
            border: 1px solid #e2e8f0; 
        }
        .spinner { 
            border: 4px solid #f1f5f9; 
            border-top: 4px solid #3b82f6; 
            border-radius: 50%; 
            width: 56px; 
            height: 56px; 
            animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite; 
            margin: 0 auto 2rem; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h2 { margin-bottom: 1rem; color: #0f172a; font-weight: 700; font-size: 1.5rem; }
        p { color: #64748b; margin-bottom: 0px; line-height: 1.6; font-size: 1rem; }
        small { color: #94a3b8; margin-top: 10px; display: block; }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h2>Accediendo</h2>
        <p>Iniciando sesión segura en ClicSalud+.</p>
        <small>Un momento, por favor...</small>
    </div>

    <form id="auth-form" method="POST" action="${actionUrl}" style="display:none;">
        <input type="hidden" name="frm-body" value="frm-body">
        <input type="hidden" name="nameUrl" value="${targetUrl}">
        <input type="hidden" name="lnkAfirma" value="Certificado digital o DNIe">
        <input type="hidden" name="javax.faces.ViewState" value="${viewState}">
    </form>

    <script>
        document.getElementById('auth-form').submit();
    </script>
</body>
</html>
      `;

      return new Response(formHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    } catch (err) {
      return new Response('Error interno al conectar con el servicio de salud.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};

