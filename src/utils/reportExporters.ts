import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReportTable = {
  name: string;
  columns: string[];
  rows: (string | number)[][];
};

const timestamp = () => new Date().toISOString().slice(0, 10);

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ===== Excel (.xlsx real, uma aba por relatório) =====
export const exportExcel = (filename: string, tables: ReportTable[], title?: string) => {
  const wb = XLSX.utils.book_new();

  if (title) {
    const cover = XLSX.utils.aoa_to_sheet([
      [title],
      ['Sistema G. Less Hortifruti'],
      [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    ]);
    XLSX.utils.book_append_sheet(wb, cover, 'Resumo');
  }

  for (const t of tables) {
    const aoa = [t.columns, ...t.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, t.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `${filename}_${timestamp()}.xlsx`);
};

// ===== PDF (tabela profissional com rodapé de totais) =====
export const exportPDF = (opts: {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  tables: (ReportTable & { note?: string })[];
  summary?: { label: string; value: string }[];
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 0;

  // Cabeçalho
  doc.setFillColor(16, 185, 129); // emerald-600
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(opts.title, 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subtitle = [opts.subtitle, opts.periodLabel].filter(Boolean).join('  •  ');
  doc.text(subtitle || 'Sistema G. Less Hortifruti', 14, 18);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 18, {
    align: 'right',
  });
  cursorY = 32;

  // Resumo (opcional)
  if (opts.summary && opts.summary.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Indicador', 'Valor']],
      body: opts.summary.map((s) => [s.label, s.value]),
      theme: 'grid',
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Tabelas
  opts.tables.forEach((t, idx) => {
    if (idx > 0 || opts.summary) {
      if (cursorY > 250) {
        doc.addPage();
        cursorY = 20;
      }
    }
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(t.name, 14, cursorY);
    cursorY += 4;

    autoTable(doc, {
      startY: cursorY,
      head: [t.columns],
      body: t.rows.map((r) => r.map((c) => String(c))),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;

    if (t.note) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(doc.splitTextToSize(t.note, pageWidth - 28), 14, cursorY + 2);
      cursorY += 10;
    } else {
      cursorY += 4;
    }
  });

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `G. Less Hortifruti — documento gerado pelo sistema em ${new Date().toLocaleDateString('pt-BR')}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, {
      align: 'right',
    });
  }

  doc.save(`${opts.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_${timestamp()}.pdf`);
};

export const fmtBRLForReport = brl;
