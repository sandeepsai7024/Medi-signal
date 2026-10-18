import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export const EvidenceChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Caught >3d Early (%)',
          'Alert Precision (%)',
          'Script Fill Rate (%)',
          'Brier Accuracy Score',
        ],
        datasets: [
          {
            label: 'Legacy Naive Reorder Rule',
            data: [28, 51, 86, 58],
            backgroundColor: 'rgba(148, 163, 184, 0.35)',
            borderColor: '#94a3b8',
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: 'MediSignal MVP (Probabilistic + Feeds)',
            data: [89, 86.4, 97.4, 85],
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { size: 11, family: 'Inter' },
              boxWidth: 14,
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#38bdf8',
            bodyColor: '#f1f5f9',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: { size: 11, family: 'Inter' },
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Benchmark Performance (%)',
              color: '#94a3b8',
              font: { size: 11, family: 'Inter' },
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 10, family: 'JetBrains Mono' },
              stepSize: 20,
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
  }, []);

  return (
    <div className="relative w-full h-64">
      <canvas ref={canvasRef} />
    </div>
  );
};
