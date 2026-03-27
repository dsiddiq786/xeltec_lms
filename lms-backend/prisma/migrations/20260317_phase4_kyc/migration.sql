-- Phase 4: KYC models and Business kyc_status

-- Create KycStatus enum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED');

-- Add kyc_status to Business
ALTER TABLE "Business" ADD COLUMN "kyc_status" "KycStatus" NOT NULL DEFAULT 'PENDING';

-- Create BusinessKyc table
CREATE TABLE "BusinessKyc" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "company_registration_number" TEXT,
    "tax_id" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "contact_first_name" TEXT,
    "contact_last_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "contact_job_title" TEXT,
    "admin_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessKyc_pkey" PRIMARY KEY ("id")
);

-- Create KycDocument table
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "kyc_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "BusinessKyc_business_id_key" ON "BusinessKyc"("business_id");
CREATE INDEX "KycDocument_kyc_id_idx" ON "KycDocument"("kyc_id");

-- Foreign keys
ALTER TABLE "BusinessKyc" ADD CONSTRAINT "BusinessKyc_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_kyc_id_fkey" FOREIGN KEY ("kyc_id") REFERENCES "BusinessKyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
