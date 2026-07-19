-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "digest_time" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_auths" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "google_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "scopes" TEXT[],
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "google_auths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "digest_date" DATE NOT NULL,
    "summary_markdown" TEXT NOT NULL,
    "links_processed" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "digests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "google_auths_user_id_key" ON "google_auths"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_auths_google_id_key" ON "google_auths"("google_id");

-- CreateIndex
CREATE INDEX "idx_digests_user_date" ON "digests"("user_id", "digest_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "digests_user_id_digest_date_key" ON "digests"("user_id", "digest_date");

-- AddForeignKey
ALTER TABLE "google_auths" ADD CONSTRAINT "google_auths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digests" ADD CONSTRAINT "digests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
