CREATE TABLE "google_accounts" (
	"email" text PRIMARY KEY NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"connected_at" timestamp with time zone NOT NULL
);
