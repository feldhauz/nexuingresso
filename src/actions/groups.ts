"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import { type FormState, formResult, UserError } from "@/lib/errors";
import { renameGroup, saveGuests } from "@/lib/groups";

async function sessionUser() {
  const user = await getUser();
  if (!user) throw new UserError("Sua sessão acabou. Entre de novo para continuar.");
  return user;
}

export async function renameGroupAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await renameGroup(await sessionUser(), String(form.get("groupId") ?? ""), String(form.get("name") ?? ""));
    refresh();
    return "Nome salvo.";
  });
}

/** Campos g_<ingresso> trazem o nome de cada convidado; o botão diz se é só salvar ou gerar os QR Codes. */
export async function saveGuestsAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    const names = new Map(
      [...form.entries()]
        .filter(([key, value]) => key.startsWith("g_") && typeof value === "string")
        .map(([key, value]) => [key.slice(2), value as string]),
    );
    const generate = form.get("intent") === "generate";
    await saveGuests(await sessionUser(), String(form.get("groupId") ?? ""), names, generate);
    refresh();
    return generate ? undefined : "Nomes salvos.";
  });
}
