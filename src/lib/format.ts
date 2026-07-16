export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR");

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (iso: string): string =>
  `${formatDate(iso)} ${formatTime(iso)}`;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Faltou",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  cancelled: "Cancelada",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  insurance: "Convênio",
  transfer: "Transferência",
};
