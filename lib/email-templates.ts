const baseStyles = `
  body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #f6f7f9;
    padding: 24px;
    color: #1f2933;
  }
  .card {
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    padding: 32px;
  }
  h1 {
    font-size: 22px;
    margin-bottom: 16px;
    color: #0f172a;
  }
  p {
    line-height: 1.5;
    margin-bottom: 16px;
  }
  .tag {
    display: inline-block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 999px;
    background-color: #eff6ff;
    color: #1d4ed8;
    margin-bottom: 12px;
  }
  .footer {
    margin-top: 32px;
    font-size: 12px;
    color: #6b7280;
  }
  .panel {
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    padding: 16px;
    margin-bottom: 16px;
  }
`;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailLayout({
  heading,
  tag,
  body,
}: {
  heading: string;
  tag?: string;
  body: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${baseStyles}</style>
  </head>
  <body>
    <div class="card">
      ${tag ? `<div class="tag">${escapeHtml(tag)}</div>` : ""}
      <h1>${escapeHtml(heading)}</h1>
      ${body}
      <p class="footer">
        United National Health Platform · Governance Console
      </p>
    </div>
  </body>
</html>`;
}

export function buildHospitalStatusEmail({
  hospitalName,
  status,
  reason,
}: {
  hospitalName: string;
  status: string;
  reason: string;
}) {
  const readableStatus = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
  const body = `
    <div class="panel">
      <p>The national governance office updated the operational status for <strong>${escapeHtml(
        hospitalName,
      )}</strong>.</p>
      <p><strong>New status:</strong> ${escapeHtml(readableStatus)}</p>
      <p><strong>Reason provided:</strong><br/>${escapeHtml(reason)}</p>
    </div>
    <p>
      This change is now reflected across the national platform. If you have concerns or additional context,
      please respond to this message so compliance partners can follow up immediately.
    </p>
  `;
  const html = renderEmailLayout({
    heading: `Status update for ${hospitalName}`,
    tag: "Hospital Status",
    body,
  });
  const text = `The United National Health governance office updated the operational status for ${hospitalName}.
New status: ${readableStatus}
Reason: ${reason}

This status is now live across the platform. Reply to this message if further action is required.
`;
  return {
    subject: `Status update: ${hospitalName} is now ${readableStatus}`,
    html,
    text,
  };
}

export function buildAdminWelcomeEmail({
  name,
  email,
  temporaryPassword,
}: {
  name: string;
  email: string;
  temporaryPassword: string;
}) {
  const body = `
    <div class="panel">
      <p>Welcome to the United National Health administration console.</p>
      <p><strong>Username:</strong> ${escapeHtml(email)}</p>
      <p><strong>Temporary password:</strong> ${escapeHtml(
        temporaryPassword,
      )}</p>
    </div>
    <p>
      Sign in immediately and rotate this password from the login page.
      If you did not expect this message, notify platform security right away.
    </p>
  `;
  const html = renderEmailLayout({
    heading: `Access granted${name ? `, ${escapeHtml(name)}` : ""}`,
    tag: "Administrator Credentials",
    body,
  });
  const text = `Welcome to the United National Health administration console.
Username: ${email}
Temporary password: ${temporaryPassword}

Sign in immediately and rotate this password. If you did not expect this, contact platform security.
`;
  return {
    subject: "Your United National Health administrator credentials",
    html,
    text,
  };
}

export function buildStaffStatusEmail({
  name,
  status,
  hospitalName,
}: {
  name: string;
  status: string;
  hospitalName: string;
}) {
  const readableStatus = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
  const body = `
    <div class="panel">
      <p>Hello ${escapeHtml(name)}, your operational access for <strong>${escapeHtml(
        hospitalName,
      )}</strong> has been updated.</p>
      <p><strong>New status:</strong> ${escapeHtml(readableStatus)}</p>
      <p>If you believe this change is in error, contact your hospital administrator immediately.</p>
    </div>
    <p class="footer">
      This message only references operational access—no patient data is included.
    </p>
  `;
  const html = renderEmailLayout({
    heading: `Access update for ${hospitalName}`,
    tag: "Access Change",
    body,
  });
  const text = `Hello ${name},
Your access for ${hospitalName} has been updated.
New status: ${readableStatus}

If this is unexpected, contact your hospital administrator immediately.`;
  return {
    subject: `Access update: ${readableStatus}`,
    html,
    text,
  };
}
