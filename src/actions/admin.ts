"use server";

import { refresh } from "next/cache";
import * as admin from "@/lib/admin";
import { getUser, type User } from "@/lib/auth";
import { type FormState, formResult, UserError } from "@/lib/errors";
import { reviewKyc } from "@/lib/kyc";
import { issueCourtesy, refundOrder } from "@/lib/orders";
import { markPayoutPaid } from "@/lib/sales";

function adminAction(run: (user: User, form: FormData) => Promise<void>, ok?: string) {
  return async (_: FormState, form: FormData): Promise<FormState> =>
    formResult(async () => {
      const user = await getUser();
      if (!user?.isAdmin) throw new UserError("Acesso restrito.");
      await run(user, form);
      refresh();
      return ok;
    });
}

const field = (form: FormData, key: string) => String(form.get(key) ?? "");

export const reviewKycAction = adminAction((user, form) =>
  reviewKyc(user, field(form, "producerId"), form.get("decision") === "approve", field(form, "note")),
);

export const reviewEventAction = adminAction((user, form) =>
  admin.setEventStatus(user, field(form, "eventId"), form.get("decision") === "approve"),
);

export const refundAction = adminAction((user, form) =>
  form.get("decision") === "reject"
    ? admin.rejectRefund(user, field(form, "orderId"))
    : refundOrder(user, field(form, "orderId")),
);

export const courtesyAction = adminAction(
  (user, form) =>
    issueCourtesy(
      user,
      field(form, "eventId"),
      field(form, "typeId"),
      Number(field(form, "quantity")),
      field(form, "email"),
      field(form, "name"),
    ),
  "Ingressos gerados e enviados por e-mail.",
);

export const payoutPaidAction = adminAction((user, form) => markPayoutPaid(user, field(form, "payoutId")));
