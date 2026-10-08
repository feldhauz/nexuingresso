"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, type User } from "@/lib/auth";
import { type FormState, formResult, UserError } from "@/lib/errors";
import { createOrder, payOrder, requestRefund, setCoupon, simulatePayment } from "@/lib/orders";

async function sessionUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new UserError("Sua sessão acabou. Entre de novo para continuar.");
  return user;
}

/** Recebe a escolha da página do evento (campos q_<tipo>) e abre o pedido. */
export async function startCheckoutAction(_: FormState, form: FormData): Promise<FormState> {
  const eventId = String(form.get("eventId") ?? "");
  const slug = String(form.get("slug") ?? "");
  const selection = [...form.entries()]
    .filter(([key]) => key.startsWith("q_"))
    .map(([key, value]) => ({ typeId: key.slice(2), quantity: Number(value) }))
    .filter((item) => item.quantity > 0);

  const user = await getUser();
  if (!user) {
    // A escolha volta na URL para o comprador não ter que refazer depois do login.
    const picked = selection.map((item) => `${item.typeId}.${item.quantity}`).join("_");
    redirect(`/entrar?next=${encodeURIComponent(`/e/${slug}?i=${picked}`)}`);
  }

  let orderId = "";
  const result = await formResult(async () => {
    orderId = await createOrder(user, eventId, selection);
  });
  if (result.error) return result;
  redirect(`/checkout/${orderId}`);
}

export async function couponAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await setCoupon(await sessionUser(), String(form.get("orderId") ?? ""), String(form.get("code") ?? ""));
    refresh();
  });
}

export async function payAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await payOrder(await sessionUser(), String(form.get("orderId") ?? ""), {
      name: String(form.get("name") ?? ""),
      cpf: String(form.get("cpf") ?? ""),
      method: form.get("method") === "card" ? "card" : "pix",
    });
    refresh();
  });
}

export async function simulatePaymentAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await simulatePayment(await sessionUser(), String(form.get("orderId") ?? ""));
    refresh();
  });
}

export async function requestRefundAction(_: FormState, form: FormData): Promise<FormState> {
  return formResult(async () => {
    await requestRefund(await sessionUser(), String(form.get("orderId") ?? ""), String(form.get("reason") ?? ""));
    refresh();
    return "Pedido de reembolso enviado. A resposta chega por e-mail.";
  });
}
