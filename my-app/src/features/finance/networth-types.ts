export type AccountDTO = {
  id: string;
  name: string;
  institution: string | null;
  kind: string;
  assetClass: string;
  currency: string;
};

export type BalanceSnapshotDTO = {
  id: string;
  accountId: string;
  date: string; // ISO 8601
  balance: number;
};
