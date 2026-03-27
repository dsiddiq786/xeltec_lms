-- Phase 5: BusinessCoursePurchase for per-course seat management

CREATE TABLE "BusinessCoursePurchase" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "seats_purchased" INTEGER NOT NULL,
    "seats_assigned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessCoursePurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessCoursePurchase_business_id_course_id_key" ON "BusinessCoursePurchase"("business_id", "course_id");
CREATE INDEX "BusinessCoursePurchase_business_id_idx" ON "BusinessCoursePurchase"("business_id");
CREATE INDEX "BusinessCoursePurchase_course_id_idx" ON "BusinessCoursePurchase"("course_id");

ALTER TABLE "BusinessCoursePurchase" ADD CONSTRAINT "BusinessCoursePurchase_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessCoursePurchase" ADD CONSTRAINT "BusinessCoursePurchase_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
