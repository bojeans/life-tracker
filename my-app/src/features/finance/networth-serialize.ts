import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";

export type AccountRow = {
  id: string;
  name: string;
  institution: string | null;
  assetClass: string;
  currency: string;
};

export type BalanceSnapshotRow = {
  id: string;
  accountId: string;
  date: Date;
  balance: unknown;
};

export function toAccountDTO(row: AccountRow): AccountDTO {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    assetClass: row.assetClass,
    currency: row.currency,
  };
}

export function toBalanceSnapshotDTO(
  row: BalanceSnapshotRow,
): BalanceSnapshotDTO {
  return {
    id: row.id,
    accountId: row.accountId,
    date: row.date.toISOString(),
    balance: Number(row.balance),
  };
}
