/** Erro com mensagem pronta para aparecer na tela. Qualquer outro erro é falha do sistema. */
export class UserError extends Error {}

export type FormState = { error?: string; ok?: string };

/** Roda uma ação de formulário e transforma UserError em mensagem. */
export async function formResult(run: () => Promise<string | void>): Promise<FormState> {
  try {
    const ok = await run();
    return ok ? { ok } : {};
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}
