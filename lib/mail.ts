import { prisma } from "./prisma";
import { ApiError } from "./api";
import { canonicalPdf } from "./pdf";
export function assertMailConfigured() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !/^[a-z0-9.-]+$/i.test(process.env.PROXY_DOMAIN ?? "") ||
      (process.env.WEBHOOK_SECRET?.length ?? 0) < 32) throw new ApiError("Envio de e-mail ainda não configurado", 503);
}
export async function deliverMail(id: string) {
  assertMailConfigured();
  const claim = await prisma.mailOutbox.updateMany({ where: { id, status: "pending", attempts: { lt: 8 },
    OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 120000) } }] },
    data: { lockedAt: new Date(), attempts: { increment: 1 } } });
  if (!claim.count) return;
  const mail = await prisma.mailOutbox.findUniqueOrThrow({ where: { id }, include: { application: { include: { candidate: true } } } });
  // Resend retains idempotency keys for 24h. Do not risk a second delivery after that window.
  if (mail.attempts > 1 && Date.now() - mail.createdAt.getTime() > 23 * 3600000) {
    await failMail(mail, true); return;
  }
  try {
    const attachments = mail.application?.origem === "candidaturaLote"
      ? [{ filename: "curriculo.pdf", content: canonicalPdf(mail.application.candidate).toString("base64") }] : undefined;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json", "Idempotency-Key": mail.id },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.body,
        reply_to: mail.replyTo ?? undefined, attachments }),
    });
    const result = await response.json();
    if (!response.ok || typeof result.id !== "string") throw new Error("Delivery failed");
    await prisma.$transaction(async tx => {
      await tx.mailOutbox.update({ where: { id }, data: { status: "sent", sentAt: new Date(), lockedAt: null, providerId: result.id } });
      if (mail.applicationId) await tx.application.updateMany({ where: { id: mail.applicationId, status: "pendente" }, data: { status: "enviado" } });
    });
  } catch { await failMail(mail, mail.attempts >= 8); }
}
async function failMail(mail: { id: string; applicationId: string | null }, terminal: boolean) {
  await prisma.$transaction(async tx => {
    await tx.mailOutbox.update({ where: { id: mail.id }, data: { status: terminal ? "failed" : "pending", lockedAt: null } });
    if (terminal && mail.applicationId) await tx.application.updateMany({ where: { id: mail.applicationId, status: "pendente" }, data: { status: "falha" } });
  });
}
export async function drainMail() {
  const pending = await prisma.mailOutbox.findMany({ where: { status: "pending", attempts: { lt: 8 } }, orderBy: { createdAt: "asc" }, take: 20 });
  for (const mail of pending) await deliverMail(mail.id);
  return pending.length;
}
