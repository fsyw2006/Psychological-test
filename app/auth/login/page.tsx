import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <section className="section-shell">
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        还没有账户？{" "}
        <Link href="/auth/register" className="font-medium text-primary">
          注册
        </Link>
      </p>
    </section>
  );
}
