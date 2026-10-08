"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, requestLoginCode, safeNext, signOut, updateName, verifyLoginCode } from "@/lib/auth";
import { type FormState, formResult, UserError } from "@/lib/errors";

export async function requestCodeAction(_: FormState, form: FormData): Promise<FormState & { email?: string }> {
  try {
    return { email: await requestLoginCode(String(form.get("email") ?? "")) };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}

export async function verifyCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const result = await formResult(() =>
    verifyLoginCode(String(form.get("email") ?? ""), String(form.get("code") ?? "")),
  );
  if (result.error) return result;
  redirect(safeNext(form.get("next")));
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

export async function updateNameAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    const user = await getUser();
    if (!user) throw new UserError("Entre de novo para continuar.");
    await updateName(user.id, String(form.get("name") ?? ""));
    refresh();
    return "Nome salvo.";
  });
}
