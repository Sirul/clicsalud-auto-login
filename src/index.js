export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = env.TARGET_URL || 'https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf?opcionSeleccionada=MUMEDICACION';

    try {
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

      const actionUrl = jsessionid 
        ? `https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/pages/anonimo/historia/medicacion/medicacionActiva.jsf;jsessionid=${jsessionid}?opcionSeleccionada=MUMEDICACION`
        : targetUrl;

      const formHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso ClicSalud+</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f7ff; color: #1e293b; }
        .card { text-align: center; padding: 2.5rem; background: white; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); max-width: 400px; width: 90%; border: 1px solid #e2e8f0; }
        .spinner { border: 4px solid #f1f5f9; border-top: 4px solid #2563eb; border-radius: 50%; width: 48px; height: 48px; animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite; margin: 0 auto 1.5rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h2 { margin-bottom: 0.75rem; color: #1e3a8a; font-weight: 700; font-size: 1.5rem; }
        p { color: #64748b; margin-bottom: 1.5rem; line-height: 1.5; }
        .btn-force { background: #eff6ff; color: #2563eb; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; text-decoration: none; font-weight: 500; border: 1px solid #dbeafe; transition: all 0.2s; }
        .btn-force:hover { background: #dbeafe; }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h2 id="status-title">Conectando...</h2>
        <p id="status-desc">Preparando tu acceso seguro a ClicSalud+.</p>
        <a href="?force=true" class="btn-force" id="force-link" style="display:none;">Forzar nuevo inicio de sesión</a>
    </div>

    <script>
        (function() {
            const TARGET_URL = ${JSON.stringify(targetUrl)};
            const ACTION_URL = ${JSON.stringify(actionUrl)};
            const VIEW_STATE = ${JSON.stringify(viewState)};
            
            const isForce = window.location.search.includes('force=true');
            const sessionActive = sessionStorage.getItem('clicsalud_session_active');

            if (sessionActive && !isForce) {
                document.getElementById('status-title').innerText = 'Redirigiendo...';
                document.getElementById('status-desc').innerText = 'Accediendo directamente con tu sesión activa.';
                window.location.href = TARGET_URL;
            } else {
                sessionStorage.setItem('clicsalud_session_active', 'true');
                document.getElementById('force-link').style.display = 'inline-block';
                
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = ACTION_URL;
                form.style.display = 'none';

                const fields = {
                    'frm-body': 'frm-body',
                    'nameUrl': TARGET_URL,
                    'lnkAfirma': 'Certificado digital o DNIe',
                    'javax.faces.ViewState': VIEW_STATE
                };

                for (const [name, value] of Object.entries(fields)) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                }

                document.body.appendChild(form);
                form.submit();
            }
        })();
    </script>
</body>
</html>
      `;

      const headers = new Headers({
        'Content-Type': 'text/html; charset=utf-8'
      });
      if (setCookie) headers.append('Set-Cookie', setCookie);

      return new Response(formHtml, { headers });
    } catch (err) {
      return new Response('Error interno al conectar con el servicio de salud.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};
