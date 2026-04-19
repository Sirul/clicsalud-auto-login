export async function handlePoc(request, env) {
  const targetUrl = env.TARGET_URL || 'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf?opcionSeleccionada=MUMEDICACION';
  const userAgent = request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

  try {
    // Paso 1: Obtener ViewState y JSESSIONID inicial de la página oficial usando el mismo User-Agent que el usuario
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': userAgent
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ClicSalud+ Pro</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; font-family: -apple-system, sans-serif; }
        #main-frame { width: 100%; height: 100%; border: none; }
        
        .status-bar { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            background: rgba(15, 23, 42, 0.95); 
            color: white; 
            font-size: 10px; 
            padding: 5px 15px; 
            padding-bottom: env(safe-area-inset-bottom, 5px);
            z-index: 100; 
            display: flex; 
            justify-content: space-between;
            backdrop-filter: blur(8px);
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
            border: 3px solid #f1f5f9; 
            border-top: 3px solid #3b82f6; 
            border-radius: 50%; 
            width: 48px; 
            height: 48px; 
            animation: spin 0.8s linear infinite; 
            margin-bottom: 24px; 
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        h2 { color: #0f172a; font-size: 1.25rem; margin: 0; font-weight: 700; }
        p { color: #64748b; font-size: 0.9rem; margin-top: 8px; text-align: center; max-width: 80%; }

        .fallback-btn {
            margin-top: 25px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            display: none;
            text-decoration: none;
            font-size: 14px;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
        }
    </style>
</head>
<body>
    <div id="loading" class="loading-overlay">
        <div class="spinner"></div>
        <h2 id="status-title">Iniciando sesión segura</h2>
        <p id="status-desc">Conectando con ClicSalud+...</p>
        <a href="/" target="_top" id="fallback" class="fallback-btn">Usar modo de redirección directa</a>
    </div>

    <div class="status-bar">
        <span> medicacion.sirul.net </span>
        <span id="domain-info">Modo Iframe Activo</span>
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
        const statusTitle = document.getElementById('status-title');
        const statusDesc = document.getElementById('status-desc');
        const fallback = document.getElementById('fallback');

        iframe.onload = function() {
            if (iframe.src !== 'about:blank') {
                statusTitle.innerText = "Sincronizado";
                statusDesc.innerText = "Acceso establecido con éxito.";
                setTimeout(() => {
                    loading.style.opacity = '0';
                    setTimeout(() => loading.style.display = 'none', 500);
                }, 800);
            }
        };

        // Tiempo de espera para detectar bloqueo de cookies de terceros
        setTimeout(() => {
            if (loading.style.display !== 'none') {
                statusTitle.innerText = "Aviso del Sistema";
                statusDesc.innerHTML = "Es posible que tu navegador esté bloqueando el inicio de sesión dentro de este marco.<br><br>Si no carga, pulsa aquí:";
                fallback.style.display = 'inline-block';
            }
        }, 6000);

        // Envío del formulario
        setTimeout(() => {
            form.submit();
        }, 200);
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
    return new Response('Error en POC: ' + err.message, { status: 500 });
  }
}

