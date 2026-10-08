"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, safeNext, type User } from "@/lib/auth";
import { type FormState, formResult, UserError } from "@/lib/errors";
import { submitKyc, uploadDocument } from "@/lib/kyc";
import * as producer from "@/lib/producer";
import { requestPayout } from "@/lib/sales";

async function sessionUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new UserError("Sua sessão acabou. Entre de novo para continuar.");
  return user;
}

const field = (form: FormData, key: string) => String(form.get(key) ?? "");

/** Ação padrão do painel: confere a sessão, executa e recarrega a tela. */
function panelAction(run: (user: User, form: FormData) => Promise<void>, ok?: string) {
  return async (_: FormState, form: FormData): Promise<FormState> =>
    formResult(async () => {
      await run(await sessionUser(), form);
      refresh();
      return ok;
    });
}

export const registerProducerAction = panelAction((user, form) => producer.registerProducer(user, form));

export async function createEventAction(_: FormState, form: FormData): Promise<FormState> {
  let eventId = "";
  const result = await formResult(async () => {
    eventId = await producer.createEvent(await sessionUser(), form);
  });
  if (result.error) return result;
  redirect(`/produtor/eventos/${eventId}`);
}

export const updateEventAction = panelAction(
  (user, form) => producer.updateEvent(user, field(form, "eventId"), form),
  "Evento salvo.",
);

export const addTicketTypeAction = panelAction((user, form) =>
  producer.addTicketType(user, field(form, "eventId"), form),
);

export const addLotAction = panelAction((user, form) => producer.addLot(user, field(form, "typeId"), form));

export const saveLotAction = panelAction(
  (user, form) =>
    form.get("intent") === "delete"
      ? producer.deleteLot(user, field(form, "lotId"))
      : producer.updateLot(user, field(form, "lotId"), form),
  "Lote salvo.",
);

export const addCouponAction = panelAction((user, form) => producer.addCoupon(user, field(form, "eventId"), form));

export const deleteCouponAction = panelAction((user, form) => producer.deleteCoupon(user, field(form, "couponId")));

export const addStaffAction = panelAction((user, form) =>
  producer.addStaff(user, field(form, "eventId"), field(form, "email")),
);

export const removeStaffAction = panelAction((user, form) =>
  producer.removeStaff(user, field(form, "eventId"), field(form, "email")),
);

export const submitEventAction = panelAction((user, form) => producer.submitEvent(user, field(form, "eventId")));

export const updateProfileAction = panelAction((user, form) => producer.updateProfile(user, form), "Perfil salvo.");

export async function followAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  // Seguir pede conta: quem não entrou vai ao login e volta para a mesma página.
  if (!user) redirect(`/entrar?next=${encodeURIComponent(safeNext(form.get("back")))}`);
  return formResult(async () => {
    await producer.toggleFollow(user, field(form, "producerId"));
    refresh();
  });
}

export const addArtistAction = panelAction((user, form) => producer.addArtist(user, field(form, "eventId"), form));

export const removeArtistAction = panelAction((user, form) => producer.removeArtist(user, field(form, "artistId")));

export const setBannerAction = panelAction((user, form) => producer.setBanner(user, field(form, "eventId"), form));

export const uploadDocumentAction = panelAction((user, form) => uploadDocument(user, field(form, "kind"), form));

export const submitKycAction = panelAction((user) => submitKyc(user));

export const requestPayoutAction = panelAction(
  (user, form) => requestPayout(user, field(form, "pixKey")),
  "Saque pedido. Você recebe um e-mail quando o Pix for enviado.",
);

export const acceptContractAction = panelAction((user, form) => producer.acceptContract(user, field(form, "version")));
