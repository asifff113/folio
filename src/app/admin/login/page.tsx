import { isSupabaseConfigured } from "@/lib/supabase/clients";
import { LoginForm } from "@/components/admin/LoginForm";
import { SetupSteps } from "@/components/admin/SetupSteps";

export default function LoginPage() {
  return (
    <main className="grid min-h-svh place-items-center px-6 py-16">
      {isSupabaseConfigured() ? (
        <div className="panel max-w-[380px]">
          <p className="eyebrow">{"// sys://admin"}</p>
          <h1 className="panel-title">Sign in</h1>
          <LoginForm />
        </div>
      ) : (
        <SetupSteps />
      )}
    </main>
  );
}
