"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { Field, SaveBar } from "./ui";

export function LoginForm() {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-2">
      <Field label="email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required className="text-input" />
      </Field>
      <Field label="password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="text-input"
        />
      </Field>
      <SaveBar state={state} label="sign_in" />
    </form>
  );
}
