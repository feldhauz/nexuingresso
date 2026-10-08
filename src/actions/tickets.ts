"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, type User } from "@/lib/auth";
import { type FormState, formResult, UserError } from "@/lib/errors";
import { acceptTransfer, cancelTransfer, checkIn, type CheckInResult, startTransfer } from "@/lib/tickets";

async function sessionUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new UserError("Sua sessão acabou. Entre de novo para continuar.");
  return user;
}

export async function transferAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await startTransfer(await sessionUser(), String(form.get("ticketId") ?? ""), String(form.get("email") ?? ""));
    refresh();
  });
}

export async function cancelTransferAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await cancelTransfer(await sessionUser(), String(form.get("ticketId") ?? ""));
    refresh();
  });
}

export async function acceptTransferAction(_: FormState, form: FormData): Promise<FormState> {
  let ticketId = "";
  const result = await formResult(async () => {
    ticketId = await acceptTransfer(await sessionUser(), String(form.get("token") ?? ""));
  });
  if (result.error) return result;
  redirect(`/ingressos/${ticketId}`);
}

/** Chamado pelo leitor da portaria a cada QR lido. */
export async function checkInAction(eventId: string, code: string): Promise<CheckInResult> {
  try {
    return await checkIn(await sessionUser(), eventId, code);
  } catch (error) {
    if (error instanceof UserError) return { state: "invalido", reason: error.message };
    throw error;
  }
}
