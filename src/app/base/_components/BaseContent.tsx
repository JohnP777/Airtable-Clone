"use client";

import React from "react";
import { api } from "An/trpc/react";
import { DataTable } from "./DataTable";

interface BaseContentProps {
  baseId: string;
}

export function BaseContent({ baseId }: BaseContentProps) {
  const { data: tables, isLoading } = api.table.list.useQuery({ baseId });

  if (isLoading) {
    return null;
  }

  if (!tables || tables.length === 0) {
    return null;
  }

  // Display the first table
  const firstTable = tables[0];

  return (
    <div className="w-full h-full">
      <DataTable tableId={firstTable.id} />
    </div>
  );
} 