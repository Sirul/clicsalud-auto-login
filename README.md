# ClicSalud+ Auto-Login Worker

This is a standalone Cloudflare Worker designed to automate the authentication process for the ClicSalud+ medication portal (Servicio Andaluz de Salud).

## Features

- **Automated Authentication**: Automatically triggers the certificate selection popup and submits the login form.
- **Session Persistence**: Robust handling of `JSESSIONID` via URL-based session rewriting to avoid cross-domain cookie issues.
- **Smart Gatekeeper**: Uses `sessionStorage` to detect active sessions and skip the login flow on subsequent visits, making the experience instantaneous.
- **Robustness**: Programmatically builds and submits forms via JavaScript to prevent HTML attribute corruption or server-side rejection.

## Deployment

1. Make sure you have [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed.
2. Clone this repository.
3. Run `npm install`.
4. Run `npm run deploy` to publish to your Cloudflare account.

## Development

Run `npm run dev` to start a local development server.

## Configuration

You can customize the target URL in `wrangler.toml` under the `[vars]` section.
