export type PaymentMethodType =
  | "egyptian_wallet"
  | "crypto";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  network?: string;
  address: string;
  enabled: boolean;
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: "vodafone-cash",
    type: "egyptian_wallet",
    name: "Vodafone Cash",
    address: "01035966569",
    enabled: true,
  },
  {
    id: "orange-cash",
    type: "egyptian_wallet",
    name: "Orange Cash",
    address: "01035966569",
    enabled: true,
  },
  {
    id: "etisalat-cash",
    type: "egyptian_wallet",
    name: "Etisalat Cash",
    address: "01035966569",
    enabled: true,
  },
  {
    id: "we-pay",
    type: "egyptian_wallet",
    name: "WE Pay",
    address: "01035966569",
    enabled: true,
  },

  {
    id: "usdt-solana",
    type: "crypto",
    name: "USDT",
    network: "Solana",
    address:
      "42PP12zAqxrfTfPJM95aQnCik7zzn79rMwqmReULEXAH",
    enabled: true,
  },
  {
    id: "usdt-ethereum",
    type: "crypto",
    name: "USDT",
    network: "Ethereum (ERC20)",
    address:
      "0x4cC83e07C5Ccd817450DB7FfEEc8206987F5f25F",
    enabled: true,
  },
  {
    id: "usdt-tron",
    type: "crypto",
    name: "USDT",
    network: "Tron (TRC20)",
    address:
      "TXsfpsJ6sw6tEMe1pmC93cWkvLYwryEBCu",
    enabled: true,
  },
  {
    id: "usdt-ton",
    type: "crypto",
    name: "USDT",
    network: "TON",
    address:
      "UQDug5oG60pc8bjHym0VXNYo2Ragk7AXbga-ydJH5uGJolTd",
    enabled: true,
  },
  {
    id: "usdt-polygon",
    type: "crypto",
    name: "USDT",
    network: "Polygon",
    address:
      "0x4cC83e07C5Ccd817450DB7FfEEc8206987F5f25F",
    enabled: true,
  },
  {
    id: "usdt-arbitrum",
    type: "crypto",
    name: "USDT",
    network: "Arbitrum",
    address:
      "0x4cC83e07C5Ccd817450DB7FfEEc8206987F5f25F",
    enabled: true,
  },
];