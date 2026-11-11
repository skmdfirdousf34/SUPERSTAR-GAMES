-- Row Level Security (RLS) Hardening Script for Supabase PostgreSQL
-- Applied to resolve Supabase Security Advisor Linter alerts (rls_disabled_in_public)

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankCreditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AviatorRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AviatorBet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WinGoRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WinGoBet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GiftCodeRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceCheckin" ENABLE ROW LEVEL SECURITY;

-- Revoke direct PostgREST HTTP access from anon and authenticated client roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;
