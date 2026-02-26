/**
 * ContaSync — Email Sender (Stub)
 * Prepared for Resend integration
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email notification
 * STUB: Logs to console. Replace with Resend when ready.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  console.log("========================================");
  console.log("[EMAIL STUB] Sending email:");
  console.log(`  To: ${options.to}`);
  console.log(`  From: ${options.from || "noreply@contasync.ro"}`);
  console.log(`  Subject: ${options.subject}`);
  console.log(`  Body length: ${options.html.length} chars`);
  console.log("========================================");

  // Simulate sending delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { success: true };
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  email: string,
  companyName: string,
  token: string,
  inviterName: string
): Promise<{ success: boolean }> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

  return sendEmail({
    to: email,
    subject: `Invitație ContaSync — ${companyName}`,
    html: `
      <h2>Ai fost invitat pe ContaSync!</h2>
      <p><strong>${inviterName}</strong> te-a invitat să colaborezi pe ContaSync pentru firma <strong>${companyName}</strong>.</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Acceptă invitația
        </a>
      </p>
      <p style="color:#666;font-size:14px;">Sau copiază acest link: ${inviteUrl}</p>
    `,
  });
}

/**
 * Send missing documents alert
 */
export async function sendMissingDocsAlert(
  email: string,
  companyName: string,
  missingDocs: string[]
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: `Documente lipsă — ${companyName}`,
    html: `
      <h2>Documente lipsă pentru ${companyName}</h2>
      <p>Următoarele documente lipsesc pentru luna curentă:</p>
      <ul>
        ${missingDocs.map((doc) => `<li>${doc}</li>`).join("")}
      </ul>
      <p>Te rugăm să le încarci cât mai curând pe <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/upload">ContaSync</a>.</p>
    `,
  });
}

/**
 * Future: Resend integration
 *
 * import { Resend } from 'resend';
 * const resend = new Resend(process.env.RESEND_API_KEY);
 *
 * const { data, error } = await resend.emails.send({
 *   from: 'ContaSync <noreply@contasync.ro>',
 *   to: [options.to],
 *   subject: options.subject,
 *   html: options.html,
 * });
 */
