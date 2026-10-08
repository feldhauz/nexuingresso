export const EVENT_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  publicado: "Publicado",
  recusado: "Precisa de ajustes",
  cancelado: "Cancelado",
};

export const ORDER_STATUS: Record<string, string> = {
  pendente: "Reservado",
  aguardando: "Aguardando pagamento",
  pago: "Pago",
  expirado: "Expirado",
  reembolsado: "Reembolsado",
};

export const TICKET_STATUS: Record<string, string> = {
  valido: "Válido",
  usado: "Entrou",
  em_transferencia: "Em transferência",
  cancelado: "Cancelado",
  sem_nome: "Sem nome",
};

export const METHOD: Record<string, string> = { pix: "Pix", card: "Cartão", gratis: "Gratuito", cortesia: "Cortesia" };
