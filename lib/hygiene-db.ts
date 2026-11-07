import { prisma } from "./prisma";
import { assertMailConfigured, drainMail } from "./mail";
const DAY = 86400000;
export async function runPersistentHygiene(now = new Date()) {
  let canMail = false;
  try { assertMailConfigured(); canMail = true; } catch {}
  const summary = { candidatesArchived: 0, vacanciesArchived: 0, candidatesPurged: 0, vacanciesPurged: 0, nudgesQueued: 0, deliveryConfigured: canMail };
  await prisma.$transaction(async tx => {
    summary.candidatesArchived = (await tx.candidateProfile.updateMany({ where: { status: "ativo", expiresAt: { lte: now } }, data: { status: "arquivado" } })).count;
    summary.vacanciesArchived = (await tx.vacancy.updateMany({ where: { status: "ativa", expiresAt: { lte: now } }, data: { status: "arquivada" } })).count;
    const cutoff = new Date(now.getTime() - 30 * DAY);
    const candidates = await tx.candidateProfile.findMany({ where: { status: "arquivado", expiresAt: { lte: cutoff } }, take: 500, select: { id: true, userId: true } });
    for (const candidate of candidates) {
      await tx.mailOutbox.deleteMany({ where: { dedupeKey: { startsWith: "candidate:" + candidate.id + ":" } } });
      await tx.hygieneEvent.deleteMany({ where: { userId: candidate.userId } });
      await tx.otpCode.deleteMany({ where: { userId: candidate.userId } });
      await tx.dailyUsage.deleteMany({ where: { actorId: "apply:" + candidate.id } });
      await tx.candidateProfile.delete({ where: { id: candidate.id } });
      summary.candidatesPurged++;
    }
    const vacancies = await tx.vacancy.findMany({ where: { status: "arquivada", expiresAt: { lte: cutoff } }, take: 500, select: { id: true } });
    for (const vacancy of vacancies) {
      await tx.mailOutbox.deleteMany({ where: { dedupeKey: { startsWith: "vacancy:" + vacancy.id + ":" } } });
      await tx.vacancy.delete({ where: { id: vacancy.id } });
      summary.vacanciesPurged++;
    }
    await tx.otpCode.deleteMany({ where: { expiraEm: { lt: cutoff } } });
    await tx.dailyUsage.deleteMany({ where: { day: { lt: cutoff.toISOString().slice(0, 10) } } });
  });
  if (canMail) {
    const candidates = await prisma.candidateProfile.findMany({ where: { status: "ativo", nudgesV: { gt: 0 }, expiresAt: { gt: now, lte: new Date(now.getTime() + 30 * DAY) } }, take: 500 });
    for (const candidate of candidates) {
      const remaining = (candidate.expiresAt.getTime() - now.getTime()) / DAY;
      const milestone = remaining <= 5 ? "D175" : remaining <= 15 ? "D165" : "D150";
      const result = await prisma.mailOutbox.createMany({ skipDuplicates: true, data: [{
        dedupeKey: "candidate:" + candidate.id + ":" + candidate.expiresAt.toISOString() + ":" + milestone,
        to: candidate.email, subject: "Atualize seu perfil W2Talent", body: "Seu perfil ficará indisponível em breve. Acesse sua conta para revisar e renovar seus dados.",
      }] });
      summary.nudgesQueued += result.count;
    }
    const vacancies = await prisma.vacancy.findMany({ where: { status: "ativa", expiresAt: { gt: now, lte: new Date(now.getTime() + 2 * DAY) } }, include: { company: true }, take: 500 });
    for (const vacancy of vacancies) {
      if (!vacancy.company.email) continue;
      const result = await prisma.mailOutbox.createMany({ skipDuplicates: true, data: [{
        dedupeKey: "vacancy:" + vacancy.id + ":" + vacancy.expiresAt.toISOString() + ":D12",
        to: vacancy.company.email, subject: "Sua vaga expira em breve", body: "A vaga " + vacancy.titulo + " está perto de expirar. Acesse sua conta para renová-la.",
      }] });
      summary.nudgesQueued += result.count;
    }
    await drainMail();
  }
  return summary;
}
