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

    // HTML del puente amigable (Senior Friendly)
    const seniorHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Mis Recetas</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%232563eb%22/><path d=%22M30 35h40v40H30z%22 fill=%22white%22/><rect x=%2245%22 y=%2220%22 width=%2210%22 height=%2220%22 rx=%222%22 fill=%22%232563eb%22/><path d=%22M40 55h20M50 45v20%22 stroke=%22%232563eb%22 stroke-width=%228%22 stroke-linecap=%22round%22/></svg>">
    <style>
        body, html { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            background: #f1f5f9; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #1e293b;
        }
        .card {
            background: white;
            padding: 3rem 2rem;
            border-radius: 2.5rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            max-width: 480px;
            width: 90%;
            box-sizing: border-box;
        }
        h1 { font-size: 2.2rem; margin-bottom: 1.5rem; color: #0f172a; line-height: 1.2; }
        p { font-size: 1.3rem; line-height: 1.6; color: #475569; margin-bottom: 2.5rem; }
        
        .spinner { 
            border: 6px solid #f1f5f9; 
            border-top: 6px solid #2563eb; 
            border-radius: 50%; 
            width: 70px; 
            height: 70px; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 2.5rem; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .btn {
            background: #2563eb;
            color: white;
            text-decoration: none;
            padding: 22px 30px;
            border-radius: 1.2rem;
            font-size: 1.5rem;
            font-weight: 800;
            display: block;
            box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .btn:active { transform: scale(0.96); }

        #ready-state { display: none; }
    </style>
</head>
<body>
    <div class="card" id="waiting-state">
        <div class="spinner"></div>
        <h1>Conectando...</h1>
        <p>Estamos preparando su acceso.<br><b>Si su móvil se lo pide, elija su certificado digital.</b></p>
    </div>

    <div class="card" id="ready-state">
        <h1 style="color: #059669; font-size: 2.5rem;">¡Todo listo!</h1>
        <p>Ya puede consultar sus recetas de forma segura.</p>
        <a href="${targetUrl}" class="btn">VER MIS RECETAS</a>
    </div>

    <!-- El "puente" invisible para forzar la sincronización TLS -->
    <iframe id="bridge" name="bridge" style="display:none;" src="about:blank"></iframe>

    <form id="auth-form" method="POST" action="${actionUrl}" target="bridge" style="display:none;">
        <input type="hidden" name="frm-body" value="frm-body">
        <input type="hidden" name="nameUrl" value="${targetUrl}">
        <input type="hidden" name="lnkAfirma" value="Certificado digital o DNIe">
        <input type="hidden" name="javax.faces.ViewState" value="${viewState}">
    </form>

    <script>
        const form = document.getElementById('auth-form');
        const iframe = document.getElementById('bridge');
        const waitState = document.getElementById('waiting-state');
        const readyState = document.getElementById('ready-state');
        let submitInterval;
        let isReady = false;

        // Cuando el iframe termina de cargar (incluso con error 401), la sesión TLS ya existe
        iframe.onload = function() {
            if (iframe.src !== 'about:blank') {
                isReady = true;
                clearInterval(submitInterval);
                waitState.style.display = 'none';
                readyState.style.display = 'block';
            }
        };

        // Función para enviar (el "modo machacón")
        function attemptSubmit() {
            if (!isReady) {
                form.submit();
            }
        }

        // Activamos el "gancho" nada más entrar y repetimos cada 15 segundos
        // Un tiempo mayor permite que el diálogo de certificados aparezca y se procese sin cortes
        setTimeout(() => {
            attemptSubmit();
            submitInterval = setInterval(attemptSubmit, 15000);
        }, 300);

        // Fallback de seguridad: si pasan 12 segundos, mostramos el botón por si acaso 
        // aunque el navegador bloquee el evento onload del iframe
        setTimeout(() => {
            if (!isReady) {
                isReady = true;
                clearInterval(submitInterval);
                waitState.style.display = 'none';
                readyState.style.display = 'block';
            }
        }, 12000);
    </script>
</body>
</html>
    `;

    return new Response(seniorHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    return new Response('Error en POC: ' + err.message, { status: 500 });
  }
}


