-- Add seat_price column to Course
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "seat_price" DECIMAL;

-- Create PurchaseRequestStatus enum
DO $$ BEGIN
    CREATE TYPE "PurchaseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PurchaseRequest table
CREATE TABLE IF NOT EXISTS "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_id" TEXT,
    "course_id" TEXT NOT NULL,
    "course_version_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "seats_requested" INTEGER NOT NULL DEFAULT 1,
    "original_price" DECIMAL(65,30) NOT NULL,
    "approved_price" DECIMAL(65,30),
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "PurchaseRequest_user_id_idx" ON "PurchaseRequest"("user_id");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_business_id_idx" ON "PurchaseRequest"("business_id");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_course_id_idx" ON "PurchaseRequest"("course_id");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");
