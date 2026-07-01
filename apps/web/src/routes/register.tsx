// Registration page. Creates the account, logs in, and redirects.
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../auth";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("register.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("register.subtitle")}</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={emailId}>{t("register.email")}</Label>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={passwordId}>{t("register.password")}</Label>
            <Input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              required
            />
            <span className="block text-xs text-muted/80">{t("register.passwordHint")}</span>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? t("register.submitting") : t("register.submit")}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        {t("register.haveAccount")}{" "}
        <Link to="/login" className="font-medium text-accent hover:text-accent-strong">
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
