import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <section className="section-shell">
      <Suspense fallback={null}>
        <AuthForm mode="register" />
      </Suspense>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        已有账户？{" "}
        <Link href="/auth/login" className="font-medium text-primary">
          登录
        </Link>
      </p>
    </section>
  );
}
