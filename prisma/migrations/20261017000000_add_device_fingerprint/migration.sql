-- One-device-one-account: store the browser fingerprint captured at signup.
ALTER TABLE "users" ADD COLUMN "device_fingerprint" TEXT;

CREATE INDEX "users_device_fingerprint_idx" ON "users"("device_fingerprint");
