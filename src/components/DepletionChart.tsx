import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ComputedInventoryItem } from '../types';

Chart.register(...registerables);

interface DepletionChartProps {
  item: ComputedInventoryItem;
}

export const DepletionChart: React.FC<DepletionChartProps> = ({ item }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const maxDays = Math.min(14, Math.max(8, Math.ceil(item.effectiveLeadTime * 2)));
    const labels = Array.from({ length: maxDays + 1 }, (_, i) => `Day ${i}`);

    const p50Series = labels.map((_, d) =>
      Math.max(0, Math.round(item.stockQty - item.effectiveDemand * d))
    );
    const p10Series = labels.map((_, d) =>
      Math.max(0, Math.round(item.stockQty - item.dailyHighDemand * d))
    );
    const p90Series = labels.map((_, d) =>
      Math.max(0, Math.round(item.stockQty - item.dailyLowDemand * d))
    );

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'P10 Worst-Case Spike',
            data: p10Series,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            borderWidth: 2,
            borderDash: [4, 3],
            pointRadius: 2.5,
            pointHoverRadius: 4.5,
            pointBackgroundColor: '#f43f5e',
            fill: '+1',
            tension: 0.25,
          },
          {
            label: 'P50 Expected Trajectory',
            data: p50Series,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#38bdf8',
            fill: '+1',
            tension: 0.25,
          },
          {
            label: 'P90 Low-Demand Bound',
            data: p90Series,
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: '#10b981',
            fill: false,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { size: 10, family: 'Inter' },
              boxWidth: 10,
              padding: 8,
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#38bdf8',
            bodyColor: '#f1f5f9',
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 10 },
            padding: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} units`,
              afterBody: () => [
                `Lead Time: ${item.effectiveLeadTime.toFixed(1)} days`,
                `P(Stockout): ${item.stockoutProb.toFixed(1)}%`,
              ],
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: { size: 10, family: 'JetBrains Mono' },
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Shelf Units Remaining',
              color: '#94a3b8',
              font: { size: 10, family: 'Inter' },
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 10, family: 'JetBrains Mono' },
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [item]);

  return (
    <div className="relative w-full h-52">
      <canvas ref={canvasRef} />
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/80 text-[10px] text-amber-300 mono pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        Arrival ETA: Day {item.effectiveLeadTime.toFixed(1)}
      </div>
    </div>
  );
};
