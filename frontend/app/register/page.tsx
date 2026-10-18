"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
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
      await register(name, email, password);
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
      <h1 className="text-[32px] font-bold">Register</h1>
      {message && (
        <div className="mt-4">
          <Notice tone="error">{message}</Notice>
        </div>
      )}
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field
          label="Name"
          id="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          errors={fieldErrors.name}
          required
        />
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
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errors={fieldErrors.password}
          required
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Register"}
        </Button>
      </form>
      <p className="mt-4 text-[14px] text-muted">
        Already have an account?{" "}
        <ButtonLink href="/login" variant="link" className="px-0">
          Log in
        </ButtonLink>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
