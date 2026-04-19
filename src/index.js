import { handlePoc } from './poc.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Servir el Manifest para PWA (Android / iOS)
    if (url.pathname === '/manifest.json') {
      const manifest = {
        name: "ClicSalud+ Recetas",
        short_name: "MisRecetas",
        start_url: "/poc",
        display: "standalone",
        background_color: "#f1f5f9",
        theme_color: "#2563eb",
        description: "Acceso automatizado a ClicSalud+",
        icons: [
          {
            src: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%232563eb%22/><path d=%22M30 35h40v40H30z%22 fill=%22white%22/><rect x=%2245%22 y=%2220%22 width=%2210%22 height=%2220%22 rx=%222%22 fill=%22%232563eb%22/><path d=%22M40 55h20M50 45v20%22 stroke=%22%232563eb%22 stroke-width=%228%22 stroke-linecap=%22round%22/></svg>",
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      };
      return new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/manifest+json' }
      });
    }

    // Ruta específica para el Experimento (Iframe POC)
    if (url.pathname === '/poc') {
      return handlePoc(request, env);
    }

    // Lógica Original / Principal (Root)
    const targetUrl = env.TARGET_URL || 'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf?opcionSeleccionada=MUMEDICACION';

    try {
      // Paso 1: Obtener ViewState y JSESSIONID de la página oficial
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
        }
      });
      
      const html = await response.text();
      const match = html.match(/id="javax.faces.ViewState" value="([^"]+)"/);
      const viewState = match ? match[1] : '';

      if (!viewState) {
        return new Response('Error: No se pudo conectar con el servicio de salud.', { status: 500 });
      }

      const setCookie = response.headers.get('Set-Cookie');
      const jsMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
      const jsessionid = jsMatch ? jsMatch[1] : null;

      const actionUrl = jsessionid 
        ? `https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf;jsessionid=${jsessionid}?opcionSeleccionada=MUMEDICACION`
        : targetUrl;

      const formHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>ClicSalud+ Acceso</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%232563eb%22/><path d=%22M30 35h40v40H30z%22 fill=%22white%22/><rect x=%2245%22 y=%2220%22 width=%2210%22 height=%2220%22 rx=%222%22 fill=%22%232563eb%22/><path d=%22M40 55h20M50 45v20%22 stroke=%22%232563eb%22 stroke-width=%228%22 stroke-linecap=%22round%22/></svg>">
    <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; font-family: -apple-system, sans-serif; }
        .card { background: white; padding: 2.5rem; border-radius: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
        .spinner { border: 4px solid #f1f5f9; border-top: 4px solid #2563eb; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.5rem; }
        p { color: #64748b; font-size: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h1>Conectando</h1>
        <p>Iniciando sesión en ClicSalud+...</p>
    </div>
    <form id="f" method="POST" action="${actionUrl}" style="display:none;">
        <input type="hidden" name="frm-body" value="frm-body">
        <input type="hidden" name="nameUrl" value="${targetUrl}">
        <input type="hidden" name="lnkAfirma" value="Certificado digital o DNIe">
        <input type="hidden" name="javax.faces.ViewState" value="${viewState}">
    </form>
    <script>document.getElementById('f').submit();</script>
</body>
</html>
      `;

      return new Response(formHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    } catch (err) {
      return new Response('Error interno.', { status: 500 });
    }
  }
};


