-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('ativo', 'arquivado', 'purgado');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('ativa', 'arquivada');

-- CreateEnum
CREATE TYPE "ApplicationOrigin" AS ENUM ('candidaturaLote', 'contatoLote', 'swipe');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('enviado', 'visualizado', 'respondido', 'arquivado');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('pendente', 'validado', 'rejeitado');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('free', 'pro');

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "logoUrl" TEXT,
    "site" TEXT,
    "validacaoStatus" "ValidationStatus" NOT NULL DEFAULT 'pendente',
    "validacaoData" TIMESTAMP(3),
    "vagasAtivasCount" INTEGER NOT NULL DEFAULT 0,
    "plano" "PlanType" NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "titulo" TEXT NOT NULL,
    "resumo3linhas" TEXT,
    "localidade" TEXT,
    "modo" TEXT,
    "regimePreferido" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pretensaoDe" INTEGER,
    "pretensaoAte" INTEGER,
    "pretensaoMoeda" TEXT DEFAULT 'BRL',
    "disponibilidade" TEXT,
    "objetivoCrescimento" TEXT NOT NULL,
    "stack" JSONB NOT NULL DEFAULT '[]',
    "experiencias" JSONB NOT NULL DEFAULT '[]',
    "formacao" JSONB NOT NULL DEFAULT '[]',
    "idiomas" JSONB NOT NULL DEFAULT '[]',
    "links" JSONB NOT NULL DEFAULT '[]',
    "celular" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsappOpt" BOOLEAN NOT NULL DEFAULT false,
    "telegramOpt" BOOLEAN NOT NULL DEFAULT false,
    "telefoneOpt" TEXT,
    "tratamentoBuscaV" INTEGER NOT NULL DEFAULT 1,
    "contatoProxyV" INTEGER NOT NULL DEFAULT 1,
    "nudgesV" INTEGER NOT NULL DEFAULT 1,
    "iaReescritaV" INTEGER NOT NULL DEFAULT 1,
    "consentTexts" JSONB NOT NULL DEFAULT '[]',
    "status" "CandidateStatus" NOT NULL DEFAULT 'ativo',
    "idiomaOriginal" TEXT NOT NULL DEFAULT 'pt-BR',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector,
    "embedding" vector(1024),

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "stack" JSONB NOT NULL DEFAULT '[]',
    "nivel" TEXT,
    "regime" TEXT,
    "localidade" TEXT,
    "faixaDe" INTEGER,
    "faixaAte" INTEGER,
    "faixaMoeda" TEXT DEFAULT 'BRL',
    "descricaoBullets" JSONB NOT NULL DEFAULT '[]',
    "beneficios" JSONB NOT NULL DEFAULT '[]',
    "tipoContrato" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renovacoes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "candidaturasCount" INTEGER NOT NULL DEFAULT 0,
    "status" "VacancyStatus" NOT NULL DEFAULT 'ativa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector,
    "embedding" vector(1024),

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT,
    "candidateId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "origem" "ApplicationOrigin" NOT NULL,
    "proxyThreadId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'enviado',
    "loteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "codigo" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "bloqueioAte" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "baseLegal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HygieneEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marco" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HygieneEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_cnpj_key" ON "CompanyProfile"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_status_idx" ON "CandidateProfile"("status");

-- CreateIndex
CREATE INDEX "CandidateProfile_expiresAt_idx" ON "CandidateProfile"("expiresAt");

-- CreateIndex
CREATE INDEX "CandidateProfile_userId_idx" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "Vacancy_status_idx" ON "Vacancy"("status");

-- CreateIndex
CREATE INDEX "Vacancy_expiresAt_idx" ON "Vacancy"("expiresAt");

-- CreateIndex
CREATE INDEX "Vacancy_companyId_idx" ON "Vacancy"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_proxyThreadId_key" ON "Application"("proxyThreadId");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_vacancyId_idx" ON "Application"("vacancyId");

-- CreateIndex
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");

-- CreateIndex
CREATE INDEX "Application_loteId_idx" ON "Application"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateId_vacancyId_key" ON "Application"("candidateId", "vacancyId");

-- CreateIndex
CREATE INDEX "OtpCode_userId_idx" ON "OtpCode"("userId");

-- CreateIndex
CREATE INDEX "OtpCode_expiraEm_idx" ON "OtpCode"("expiraEm");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");

-- CreateIndex
CREATE INDEX "HygieneEvent_userId_idx" ON "HygieneEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HygieneEvent_userId_marco_date_key" ON "HygieneEvent"("userId", "marco", "date");

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CandidateProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
