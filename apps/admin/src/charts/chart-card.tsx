import { BarChart3, Table2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@joymusic/ui";
import { useT } from "../i18n";
import { Panel } from "../components/page";

export interface ChartTableData {
  columns: readonly string[];
  rows: ReadonlyArray<readonly (string | number)[]>;
}

export interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  legend?: ReactNode;
  table?: ChartTableData;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  badge,
  legend,
  table,
  children,
  className,
}: ChartCardProps) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        <>
          {badge}
          {table ? (
            <IconButton
              size="sm"
              label={showTable ? t("chart.showChart") : t("chart.showTable")}
              pressed={showTable}
              icon={
                showTable ? (
                  <BarChart3 aria-hidden="true" className="size-4" />
                ) : (
                  <Table2 aria-hidden="true" className="size-4" />
                )
              }
              onClick={() => setShowTable((value) => !value)}
            />
          ) : null}
        </>
      }
    >
      {legend}
      {showTable && table ? (
        <div className="max-h-[300px] overflow-y-auto">
          <Table aria-label={title}>
            <TableHead>
              <TableRow interactive={false}>
                {table.columns.map((column, index) => (
                  <TableHeaderCell key={column} numeric={index > 0}>
                    {column}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {table.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} numeric={cellIndex > 0} mono={cellIndex > 0}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        children
      )}
    </Panel>
  );
}
