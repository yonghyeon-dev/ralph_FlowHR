"use client";

import type { HTMLAttributes } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartDatum {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface BarChartProps extends HTMLAttributes<HTMLDivElement> {
  data: BarChartDatum[];
  dataKey?: string;
  layout?: "horizontal" | "vertical";
  height?: number;
  barColor?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
}

const BRAND_COLOR = "#0d6a61";

function BarChart({
  data,
  dataKey = "value",
  layout = "vertical",
  height = 250,
  barColor = BRAND_COLOR,
  showGrid = false,
  showTooltip = true,
  className = "",
  ...props
}: BarChartProps) {
  return (
    <div
      className={["w-full", className].filter(Boolean).join(" ")}
      style={{ height }}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%">
        {layout === "vertical" ? (
          <RechartsBarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12, fill: "#4b5563" }}
              axisLine={false}
              tickLine={false}
            />
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              />
            )}
            <Bar
              dataKey={dataKey}
              fill={barColor}
              radius={[0, 4, 4, 0]}
              barSize={20}
            />
          </RechartsBarChart>
        ) : (
          <RechartsBarChart
            data={data}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#4b5563" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#4b5563" }}
              axisLine={false}
              tickLine={false}
            />
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              />
            )}
            <Bar
              dataKey={dataKey}
              fill={barColor}
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </RechartsBarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export { BarChart };
export type { BarChartProps, BarChartDatum };
