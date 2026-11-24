/** Shown on /admin until the Supabase environment variables are set. */
export function SetupSteps() {
  const steps = [
    <>
      Create a free project at <span className="text-fg">supabase.com</span>.
    </>,
    <>
      In the project, open <span className="text-fg">SQL Editor</span>, paste{" "}
      <code className="text-fg">supabase/schema.sql</code> and run it.
    </>,
    <>
      Copy <code className="text-fg">.env.example</code> to <code className="text-fg">.env.local</code> and fill in the
      project URL and publishable key (Project Settings → API Keys).
    </>,
    <>
      Under <span className="text-fg">Authentication → Users</span>, add your user with a password, and turn off new
      sign-ups under Authentication → Sign In / Providers.
    </>,
    <>
      Run the last statement in <code className="text-fg">schema.sql</code> with your email to make that user an
      admin.
    </>,
    <>Restart the dev server and sign in here.</>,
  ];

  return (
    <div className="panel max-w-[560px]">
      <p className="eyebrow">{"// sys://admin · offline"}</p>
      <h1 className="panel-title">Connect the database</h1>
      <p className="panel-text">
        The admin panel saves to Supabase, which is not connected yet. Until it is, the site shows the placeholder
        content.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 font-mono text-[13px] leading-relaxed text-muted">
            <span className="text-holo">{String(i + 1).padStart(2, "0")}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
