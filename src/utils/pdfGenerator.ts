import { jsPDF } from 'jspdf';
import { Project, TranscriptSegment, Speaker } from '../types';
import { formatDuration } from './formatters';

export interface ExportSectionsSelection {
  summary: boolean;
  transcript: boolean;
  meetingIntelligence: boolean;
  researchMode: boolean;
  studyMaterial: boolean;
  knowledgeMap: boolean;
  userNotes: boolean;
}

export interface PDFExportOptions {
  sections: ExportSectionsSelection;
  includeQuizAnswers?: boolean;
  targetLang?: string;
}

/**
 * Generate a professional multi-page PDF document for a Veyra Project.
 */
export async function generateProjectPDF(
  project: Project,
  options: PDFExportOptions
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const fontTitle = 'helvetica';
  const colorPrimary = [17, 17, 17]; // #111111
  const colorSecondary = [102, 102, 102]; // #666666
  const colorAccent = [5, 150, 105]; // emerald-600
  const colorLine = [229, 229, 229]; // #E5E5E5

  // Helper to check space & add page if needed
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin + 20; // top padding on new page
      return true;
    }
    return false;
  };

  // Helper to draw horizontal line
  const drawDivider = () => {
    ensureSpace(15);
    doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;
  };

  // Helper to draw section header
  const drawSectionHeader = (title: string) => {
    ensureSpace(35);
    doc.setFont(fontTitle, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text(title.toUpperCase(), margin, y);
    y += 18;

    doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, y - 10, margin + 60, y - 10);
    y += 5;
  };

  // Helper to render wrapped paragraph
  const renderParagraph = (
    text: string,
    fontSize = 10,
    fontStyle = 'normal',
    color = colorPrimary,
    indent = 0
  ) => {
    doc.setFont(fontTitle, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const availableW = contentWidth - indent;
    const lines = doc.splitTextToSize(text, availableW);
    const lineHeight = fontSize * 1.3;

    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      doc.text(line, margin + indent, y);
      y += lineHeight;
    }
    y += 4;
  };

  // 1. COVER / HEADER BLOCK
  doc.setFillColor(248, 250, 252); // light slate tint
  doc.rect(margin, y, contentWidth, 75, 'F');
  doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
  doc.rect(margin, y, contentWidth, 75, 'S');

  doc.setFont(fontTitle, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text('VEYRA INTELLIGENCE REPORT', margin + 15, y + 25);

  doc.setFont(fontTitle, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
  doc.text(`PROJECT: ${project.name}`, margin + 15, y + 42);

  doc.setFont(fontTitle, 'normal');
  doc.setFontSize(9);
  const metaText = `Duration: ${formatDuration(project.duration)}   |   Export Date: ${new Date().toLocaleDateString()}   |   File: ${project.fileName}`;
  doc.text(metaText, margin + 15, y + 58);

  y += 90;

  // Stale Warning Banner if transcript changed
  if (project.meetingIntelligence?.isOutdated || project.knowledgeMap?.isOutdated) {
    ensureSpace(25);
    doc.setFillColor(254, 243, 199); // amber 100
    doc.rect(margin, y, contentWidth, 20, 'F');
    doc.setFont(fontTitle, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14); // amber 800
    doc.text('NOTE: Some analysis sections were generated from an earlier transcript version.', margin + 10, y + 13);
    y += 28;
  }

  // Active Table of Contents if multiple sections selected
  const activeSectionTitles: string[] = [];
  if (options.sections.summary && (project.summary || project.aiAnalysisResults?.summary)) activeSectionTitles.push('Executive Summary & Key Points');
  if (options.sections.meetingIntelligence && project.meetingIntelligence) activeSectionTitles.push('Meeting & Decision Intelligence');
  if (options.sections.researchMode && project.researchItems && project.researchItems.length > 0) activeSectionTitles.push('Research Mode Findings');
  if (options.sections.knowledgeMap && project.knowledgeMap && project.knowledgeMap.nodes.length > 0) activeSectionTitles.push('Knowledge Map Topics');
  if (options.sections.studyMaterial) activeSectionTitles.push('Study Material & Quiz');
  if (options.sections.userNotes && (project.notes || project.highlights)) activeSectionTitles.push('User Notes & Highlights');
  if (options.sections.transcript && project.transcript && project.transcript.length > 0) activeSectionTitles.push('Full Video Transcript');

  if (activeSectionTitles.length >= 2) {
    drawSectionHeader('Table of Contents');
    activeSectionTitles.forEach((sec, i) => {
      renderParagraph(`${i + 1}.  ${sec}`, 10, 'normal', colorSecondary, 10);
    });
    drawDivider();
  }

  // 2. EXECUTIVE SUMMARY & KEY POINTS
  if (options.sections.summary && (project.summary || project.aiAnalysisResults?.summary)) {
    drawSectionHeader('Executive Summary');
    const summaryObj = project.summary || project.aiAnalysisResults?.summary;

    if (summaryObj?.overview) {
      renderParagraph('Overview', 11, 'bold', colorPrimary);
      renderParagraph(summaryObj.overview, 10, 'normal', colorPrimary, 5);
      y += 6;
    }

    const keyPoints = summaryObj?.keyPoints || project.aiAnalysisResults?.keyPoints?.map(k => k.description);
    if (keyPoints && keyPoints.length > 0) {
      renderParagraph('Key Takeaways', 11, 'bold', colorPrimary);
      keyPoints.forEach((kp, idx) => {
        const text = typeof kp === 'string' ? kp : (kp as any).description || (kp as any).title;
        renderParagraph(`•  ${text}`, 9.5, 'normal', colorPrimary, 10);
      });
      y += 6;
    }

    drawDivider();
  }

  // 3. MEETING INTELLIGENCE
  if (options.sections.meetingIntelligence && project.meetingIntelligence) {
    const mi = project.meetingIntelligence;
    drawSectionHeader('Meeting & Decision Intelligence');

    if (mi.summary) {
      renderParagraph('Meeting Brief', 11, 'bold', colorPrimary);
      renderParagraph(mi.summary, 10, 'normal', colorPrimary, 5);
      y += 6;
    }

    if (mi.decisions && mi.decisions.length > 0) {
      renderParagraph(`Decisions (${mi.decisions.length})`, 11, 'bold', colorPrimary);
      mi.decisions.forEach((d, i) => {
        const timecode = formatDuration(d.timestamp);
        renderParagraph(`${i + 1}.  ${d.text}  [Source — ${timecode}]`, 9.5, 'bold', colorPrimary, 10);
        if (d.context) {
          renderParagraph(`Context: ${d.context}`, 9, 'italic', colorSecondary, 20);
        }
      });
      y += 6;
    }

    if (mi.actionItems && mi.actionItems.length > 0) {
      renderParagraph(`Action Items (${mi.actionItems.length})`, 11, 'bold', colorPrimary);
      mi.actionItems.forEach((a, i) => {
        const timecode = formatDuration(a.timestamp);
        const ownerStr = a.owner ? ` | Owner: ${a.owner}` : '';
        const deadlineStr = a.deadline ? ` | Deadline: ${a.deadline}` : '';
        renderParagraph(`${i + 1}. [${a.status.toUpperCase()}]  ${a.task}${ownerStr}${deadlineStr}  [Source — ${timecode}]`, 9.5, 'normal', colorPrimary, 10);
      });
      y += 6;
    }

    if (mi.openQuestions && mi.openQuestions.length > 0) {
      renderParagraph(`Open Questions (${mi.openQuestions.length})`, 11, 'bold', colorPrimary);
      mi.openQuestions.forEach((q, i) => {
        const timecode = formatDuration(q.timestamp);
        renderParagraph(`${i + 1}. [${q.status.toUpperCase()}]  ${q.question}  [Source — ${timecode}]`, 9.5, 'normal', colorPrimary, 10);
      });
      y += 6;
    }

    drawDivider();
  }

  // 4. RESEARCH MODE FINDINGS
  if (options.sections.researchMode && project.researchItems && project.researchItems.length > 0) {
    drawSectionHeader('Research Mode Investigation');

    project.researchItems.forEach((res, rIdx) => {
      renderParagraph(`Research #${rIdx + 1}: ${res.title}`, 12, 'bold', colorPrimary);
      renderParagraph(`Query: "${res.query}"`, 10, 'italic', colorSecondary, 5);
      y += 4;

      if (res.summary) {
        renderParagraph(res.summary, 9.5, 'normal', colorPrimary, 5);
        y += 4;
      }

      if (res.findings && res.findings.length > 0) {
        renderParagraph('Claims & Evidence:', 10.5, 'bold', colorPrimary, 5);
        res.findings.forEach((f, fIdx) => {
          const timecode = formatDuration(f.timestamp);
          const typeTag = f.claimType ? `[${f.claimType.toUpperCase()}]` : '';
          renderParagraph(`• ${typeTag} ${f.claim}  (Source — ${timecode})`, 9.5, 'bold', colorPrimary, 12);
          if (f.excerpt) {
            renderParagraph(`Excerpt: "${f.excerpt}"`, 9, 'italic', colorSecondary, 22);
          }
          if (f.userNotes) {
            renderParagraph(`My Notes: ${f.userNotes}`, 9, 'bold', colorAccent, 22);
          }
        });
        y += 4;
      }


      if (res.contradictions && res.contradictions.length > 0) {
        renderParagraph('Contradictions Identified:', 10.5, 'bold', [220, 38, 38], 5);
        res.contradictions.forEach((c, cIdx) => {
          renderParagraph(`! Statement A (${formatDuration(c.timestampA)}): "${c.claimA}" vs. Statement B (${formatDuration(c.timestampB)}): "${c.claimB}"`, 9, 'normal', colorPrimary, 12);
        });
        y += 4;
      }
    });

    drawDivider();
  }

  // 5. KNOWLEDGE MAP
  if (options.sections.knowledgeMap && project.knowledgeMap && project.knowledgeMap.nodes.length > 0) {
    drawSectionHeader('Knowledge Map Topics');

    project.knowledgeMap.nodes.forEach((node, nIdx) => {
      const srcTs = node.sources[0]?.timestamp || 0;
      renderParagraph(`${nIdx + 1}. ${node.name}  [${node.type.toUpperCase()}]  (Source — ${formatDuration(srcTs)})`, 10.5, 'bold', colorPrimary);
      if (node.summary) {
        renderParagraph(node.summary, 9.5, 'normal', colorSecondary, 12);
      }
      y += 2;
    });

    drawDivider();
  }

  // 6. STUDY MATERIAL & QUIZ
  if (options.sections.studyMaterial) {
    drawSectionHeader('Study Material & Self-Assessment');

    const segments = project.transcript || [];
    const summary = project.summary || project.aiAnalysisResults?.summary;
    const keyPoints = summary?.keyPoints || [];

    if (keyPoints.length > 0) {
      renderParagraph('Key Core Concepts', 11, 'bold', colorPrimary);
      keyPoints.forEach((kp, idx) => {
        renderParagraph(`${idx + 1}.  ${kp}`, 9.5, 'normal', colorPrimary, 10);
      });
      y += 6;
    }

    if (segments.length > 0) {
      renderParagraph('Quiz & Knowledge Check', 11, 'bold', colorPrimary);

      const q1Text = `What main topic is introduced in the opening segment of "${project.name}"?`;
      const q1OptA = segments[0]?.text || 'Main topic overview';
      const q1OptB = 'Unrelated off-topic summary';

      renderParagraph('Q1: ' + q1Text, 10, 'bold', colorPrimary, 5);
      renderParagraph('A) ' + q1OptA, 9.5, 'normal', colorPrimary, 15);
      renderParagraph('B) ' + q1OptB, 9.5, 'normal', colorPrimary, 15);

      if (options.includeQuizAnswers) {
        renderParagraph('Correct Answer: A', 9, 'bold', colorAccent, 15);
        renderParagraph(`Explanation: Sourced from segment at ${formatDuration(segments[0]?.startTime || 0)}.`, 8.5, 'italic', colorSecondary, 15);
      }
      y += 6;

      if (segments.length > 2) {
        const midSeg = segments[Math.floor(segments.length / 2)];
        renderParagraph(`Q2: Around timecode ${formatDuration(midSeg.startTime)}, what key dialogue occurs?`, 10, 'bold', colorPrimary, 5);
        renderParagraph('A) ' + midSeg.text, 9.5, 'normal', colorPrimary, 15);
        renderParagraph('B) Silent video pause', 9.5, 'normal', colorPrimary, 15);

        if (options.includeQuizAnswers) {
          renderParagraph('Correct Answer: A', 9, 'bold', colorAccent, 15);
          renderParagraph(`Explanation: Sourced from timecode ${formatDuration(midSeg.startTime)}.`, 8.5, 'italic', colorSecondary, 15);
        }
        y += 6;
      }
    }

    drawDivider();
  }

  // 7. USER NOTES & HIGHLIGHTS
  if (options.sections.userNotes && ((project.notes && project.notes.length > 0) || (project.highlights && project.highlights.length > 0))) {
    drawSectionHeader('User Notes & Highlights (My Notes)');

    if (project.notes && project.notes.length > 0) {
      renderParagraph('Saved Notes:', 11, 'bold', colorPrimary);
      project.notes.forEach((n) => {
        const timecode = n.timestamp ? ` [${formatDuration(n.timestamp)}]` : '';
        renderParagraph(`• ${n.content}${timecode}`, 9.5, 'normal', colorPrimary, 10);
      });
      y += 6;
    }

    if (project.highlights && project.highlights.length > 0) {
      renderParagraph('Saved Highlights:', 11, 'bold', colorPrimary);
      project.highlights.forEach((h) => {
        const timecode = h.timestamp ? ` [${formatDuration(h.timestamp)}]` : '';
        renderParagraph(`• "${h.text}"${timecode}`, 9.5, 'italic', colorSecondary, 10);
      });
      y += 6;
    }

    drawDivider();
  }


  // 8. FULL TRANSCRIPT
  if (options.sections.transcript && project.transcript && project.transcript.length > 0) {
    drawSectionHeader('Full Video Transcript');

    const speakerMap = new Map((project.speakers || []).map((s) => [s.id, s.name]));
    const segments = options.targetLang && options.targetLang !== 'source' && project.translations?.[options.targetLang]
      ? project.translations[options.targetLang]
      : project.transcript;

    segments.forEach((seg) => {
      const spkName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      const timecode = formatDuration(seg.startTime);

      ensureSpace(22);
      doc.setFont(fontTitle, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]);
      doc.text(`[${timecode}] ${spkName}:`, margin, y);
      y += 12;

      renderParagraph(seg.text, 9.5, 'normal', colorPrimary, 10);
      y += 2;
    });
  }

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont(fontTitle, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);

    const footerText = `VEYRA Professional Intelligence Report   •   ${project.name}   •   Page ${page} of ${totalPages}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 20, { align: 'center' });
  }

  return doc.output('blob');
}
