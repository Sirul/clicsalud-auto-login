export async function handlePoc(request, env) {
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

    // HTML con Iframe y carga por debajo
    const pocHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ClicSalud+ Pro</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; font-family: -apple-system, sans-serif; }
        #main-frame { width: 100%; height: 100%; border: none; }
        
        .status-bar { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            background: rgba(15, 23, 42, 0.9); 
            color: white; 
            font-size: 10px; 
            padding: 4px 15px; 
            z-index: 100; 
            display: flex; 
            justify-content: space-between;
            backdrop-filter: blur(4px);
            border-top: 1px solid rgba(255,255,255,0.1);
        }

        .loading-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            bottom: 0; 
            background: #ffffff; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            z-index: 50; 
            transition: opacity 0.5s ease; 
        }

        .spinner { 
            border: 4px solid #f1f5f9; 
            border-top: 4px solid #3b82f6; 
            border-radius: 50%; 
            width: 48px; 
            height: 48px; 
            animation: spin 1s linear infinite; 
            margin-bottom: 24px; 
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        h2 { color: #0f172a; font-size: 1.25rem; margin: 0; font-weight: 700; }
        p { color: #64748b; font-size: 0.875rem; margin-top: 8px; }
    </style>
</head>
<body>
    <div id="loading" class="loading-overlay">
        <div class="spinner"></div>
        <h2>Cargando ClicSalud+</h2>
        <p>Estableciendo conexión segura...</p>
    </div>

    <div class="status-bar">
        <span>URL Persistente: medicacion.sirul.net</span>
        <span>Autenticación TLS Directa</span>
    </div>

    <iframe id="main-frame" name="main-frame" src="about:blank"></iframe>

    <form id="auth-form" method="POST" action="${actionUrl}" target="main-frame" style="display:none;">
        <input type="hidden" name="frm-body" value="frm-body">
        <input type="hidden" name="nameUrl" value="${targetUrl}">
        <input type="hidden" name="lnkAfirma" value="Certificado digital o DNIe">
        <input type="hidden" name="javax.faces.ViewState" value="${viewState}">
    </form>

    <script>
        const form = document.getElementById('auth-form');
        const iframe = document.getElementById('main-frame');
        const loading = document.getElementById('loading');

        // Escuchar el load del iframe para ocultar el splash screen
        iframe.onload = function() {
            // Un pequeño retraso para que la página de la Junta se renderice un poco
            setTimeout(() => {
                loading.style.opacity = '0';
                setTimeout(() => loading.style.display = 'none', 500);
            }, 800);
        };

        // Enviar el formulario al iframe
        setTimeout(() => {
            form.submit();
        }, 100);
    </script>
</body>
</html>
    `;

    return new Response(pocHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    return new Response('Error en el POC de Iframe: ' + err.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
