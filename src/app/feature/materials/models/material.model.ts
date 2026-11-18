interface BuilderSummary {
  name: string;
  count: number;
  totalPrice: number;
  totalPaid: number;
  dueAmount: number;
}

interface MaterialSummary {
  name: string;
  count: number;
  totalPrice: number;
}

type MaterialViewType = 'builder' | 'material';

export type { BuilderSummary, MaterialSummary, MaterialViewType };
