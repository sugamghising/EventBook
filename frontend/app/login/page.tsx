"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setFieldErrors({});
    try {
      await login(email, password);
      // Only same-site paths may be navigated to (blocks "//host" redirects too).
      const raw = params.get("next");
      const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
      router.push(next);
    } catch (err) {
      setPending(false);
      if (err instanceof ApiError) {
        if (err.details) setFieldErrors(err.details);
        else setMessage(err.message);
      } else {
        setMessage("Something went wrong");
      }
    }
  }

  return (
    <div className="max-w-[420px]">
      <h1 className="text-[32px] font-bold">Log in</h1>
      {message && (
        <div className="mt-4">
          <Notice tone="error">{message}</Notice>
        </div>
      )}
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errors={fieldErrors.email}
          required
        />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errors={fieldErrors.password}
          required
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-4 text-[14px] text-muted">
        No account?{" "}
        <ButtonLink href="/register" variant="link" className="px-0">
          Register
        </ButtonLink>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
