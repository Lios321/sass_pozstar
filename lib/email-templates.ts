type CTA = { label: string; url: string }

function baseEmail(title: string, preheader: string, contentHtml: string) {
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body{margin:0;padding:0;background:#f6f8fb;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;color:#1f2937}
      .container{max-width:640px;margin:0 auto;padding:24px}
      .card{background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.08);overflow:hidden}
      .header{padding:28px 28px 12px 28px;border-bottom:1px solid #eef2f7;text-align:center}
      .brand{display:inline-flex;align-items:center;gap:12px;justify-content:center}
      .brand-badge{width:44px;height:44px;border-radius:12px;background:#2563eb;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:18px}
      .brand-name{font-size:22px;font-weight:700;color:#111827;letter-spacing:.2px}
      .title{font-size:20px;font-weight:700;color:#111827;margin:18px 0 6px}
      .content{padding:28px}
      .cta{margin:20px 0}
      .button{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600}
      .muted{color:#6b7280}
      .footer{padding:20px 28px;border-top:1px solid #eef2f7;text-align:center;font-size:12px;color:#6b7280}
      .preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0}
    </style>
  </head>
  <body>
    <div class="preheader">${preheader}</div>
    <div class="container">
      <div class="card">
        <div class="header">
          <div class="brand">
            <div class="brand-badge">P</div>
            <div class="brand-name">Pozstar</div>
          </div>
          <div class="title">${title}</div>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          Este é um email automático. Não responda diretamente. © Pozstar
        </div>
      </div>
    </div>
  </body>
  </html>
  `
}

export function inviteTemplate(name: string, cta: CTA) {
  const pre = 'Crie sua senha para acessar o Pozstar'
  const content = `
    <p>Olá, <strong>${name}</strong>.</p>
    <p>Um acesso foi criado para você no sistema Pozstar.</p>
    <div class="cta">
      <a class="button" href="${cta.url}" target="_blank" rel="noopener">${cta.label}</a>
    </div>
    <p class="muted">Se você não solicitou este acesso, ignore este email.</p>
    <p class="muted">Por segurança, este link expira em 48 horas.</p>
  `
  return baseEmail('Definir senha', pre, content)
}

