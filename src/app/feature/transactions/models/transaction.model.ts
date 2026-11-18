interface ReceiverSummary {
  name: string;
  count: number;
  totalAmount: number;
}

interface ReceiverOption {
  name: string;
  group: 'Builders' | 'Contractors' | 'Previous Receivers';
}

export type { ReceiverSummary, ReceiverOption };
