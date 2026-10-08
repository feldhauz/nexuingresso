import "server-only";

/**
 * Consulta o CNPJ na base pública da Receita Federal, pela BrasilAPI. Devolve uma linha para
 * o admin conferir na verificação ("ATIVA — RAZÃO SOCIAL"). É só apoio: se o serviço estiver
 * fora do ar, o cadastro segue e a linha diz que não foi possível consultar.
 */
export async function lookupCnpj(cnpj: string): Promise<string> {
  try {
    // A BrasilAPI recusa (403) pedidos sem identificação de quem está chamando.
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "User-Agent": "Colaja/1.0 (colajaingressos.com.br)", Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 404) return "Receita: CNPJ não encontrado";
    if (!response.ok) return "Receita: consulta indisponível";
    const data = (await response.json()) as { razao_social?: string; descricao_situacao_cadastral?: string };
    return `Receita: ${data.descricao_situacao_cadastral ?? "situação desconhecida"} — ${data.razao_social ?? "sem razão social"}`;
  } catch {
    return "Receita: consulta indisponível";
  }
}
