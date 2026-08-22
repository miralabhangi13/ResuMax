const PDFDocument = require("pdfkit");

/**
 * Generates an ATS Resume Analysis PDF and pipes it to the provided writable stream.
 * @param {Object} data - The JSON response from Groq.
 * @param {Stream} stream - Writable stream (e.g., Express `res`).
 */
function generateATSReportPDF(data, stream) {
    // Initialize PDF document with A4 format and margins
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
    });

    // Pipe the PDF directly to the Express response stream
    doc.pipe(stream);

    const colors = {
        primary: '#2563EB',     // Blue
        success: '#10B981',     // Green
        warning: '#F59E0B',     // Yellow/Orange
        danger: '#EF4444',      // Red
        textMain: '#1F2937',    // Dark Gray
        textMuted: '#6B7280',   // Gray
        border: '#E5E7EB',      // Light Gray
        bgLight: '#F9FAFB'      // Off white
    };

    const pageWidth = doc.page.width;
    const rightMargin = doc.page.margins.right;
    const leftMargin = doc.page.margins.left;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    // Helper: Checks if we are close to the bottom and adds a new page
    const checkPageBreak = (neededHeight = 100) => {
        if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            return true;
        }
        return false;
    };

    // --- 1. HEADER ---
    doc.fontSize(28).fillColor(colors.primary).font('Helvetica-Bold').text('ResuMax', { continued: true });
    doc.fontSize(14).fillColor(colors.textMuted).font('Helvetica').text('  |  AI Resume Analysis Report', { align: 'right' });
    
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(10).fillColor(colors.textMuted).text(`Generated: ${dateStr}`, { align: 'right' });
    doc.moveDown(1);
    doc.lineWidth(2).strokeColor(colors.border).moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke();
    doc.moveDown(2);

    // --- 2. ATS SCORE HERO SECTION ---
    const heroY = doc.y;
    doc.roundedRect(leftMargin, heroY, contentWidth, 120, 8).fillAndStroke(colors.bgLight, colors.border);
    
    doc.fillColor(colors.textMuted).fontSize(14).font('Helvetica-Bold').text('FINAL ATS SCORE', leftMargin, heroY + 20, { align: 'center', width: contentWidth });
    doc.fillColor(colors.primary).fontSize(50).font('Helvetica-Bold').text(`${data.finalScore || 0}%`, leftMargin, heroY + 40, { align: 'center', width: contentWidth });
    
    const ratingColor = (data.finalScore >= 80) ? colors.success : (data.finalScore >= 60) ? colors.warning : colors.danger;
    doc.fillColor(ratingColor).fontSize(16).font('Helvetica-Bold').text(`Rating: ${data.rating || 'N/A'}`, leftMargin, heroY + 100, { align: 'center', width: contentWidth });
    
    doc.y = heroY + 140;

    // --- 3. SCORE CARDS ---
    const cardWidth = (contentWidth - 40) / 3;
    const drawCard = (x, y, title, score, color) => {
        doc.roundedRect(x, y, cardWidth, 90, 8).fillAndStroke('#FFFFFF', colors.border);
        doc.fillColor(colors.textMuted).fontSize(11).font('Helvetica-Bold').text(title, x + 15, y + 15);
        doc.fillColor(colors.textMain).fontSize(24).font('Helvetica-Bold').text(`${score || 0}%`, x + 15, y + 35);
        
        // Progress bar
        const barWidth = cardWidth - 30;
        doc.roundedRect(x + 15, y + 70, barWidth, 6, 3).fill(colors.bgLight);
        doc.roundedRect(x + 15, y + 70, barWidth * ((score || 0) / 100), 6, 3).fill(color);
    };

    const cardsY = doc.y;
    drawCard(leftMargin, cardsY, 'TECHNICAL', data.technicalScore, colors.primary);
    drawCard(leftMargin + cardWidth + 20, cardsY, 'SEMANTIC', data.semanticScore, '#8B5CF6'); // Purple
    drawCard(leftMargin + (cardWidth + 20) * 2, cardsY, 'QUALITY', data.qualityScore, colors.success);
    
    doc.y = cardsY + 110;

    // --- HELPER: SECTION TITLE ---
    const drawSectionTitle = (title) => {
        checkPageBreak(80);
        doc.moveDown(1);
        doc.fontSize(14).fillColor(colors.textMain).font('Helvetica-Bold').text(title.toUpperCase());
        doc.lineWidth(1).strokeColor(colors.border).moveTo(leftMargin, doc.y + 5).lineTo(pageWidth - rightMargin, doc.y + 5).stroke();
        doc.moveDown(1.5);
    };

    // --- 4. AI SUMMARY ---
    drawSectionTitle('AI Summary');
    doc.fontSize(12).fillColor(colors.textMain).font('Helvetica').text(data.summary || 'No summary provided.', {
        lineGap: 4,
        align: 'justify'
    });

    // --- HELPER: BADGES (For Skills) ---
    const drawBadges = (items, bgColor, textColor, borderColor) => {
        if (!items || items.length === 0) {
            doc.fontSize(11).fillColor(colors.textMuted).text('None recorded.');
            return;
        }

        let currentX = leftMargin;
        let currentY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);

        items.forEach(item => {
            const textWidth = doc.widthOfString(item);
            const badgeWidth = textWidth + 20;

            // Wrap to next line if exceeds width
            if (currentX + badgeWidth > pageWidth - rightMargin) {
                currentX = leftMargin;
                currentY += 28;
                if (currentY > doc.page.height - doc.page.margins.bottom - 40) {
                    doc.addPage();
                    currentY = doc.page.margins.top;
                }
            }

            doc.roundedRect(currentX, currentY, badgeWidth, 20, 10).fillAndStroke(bgColor, borderColor);
            doc.fillColor(textColor).text(item, currentX + 10, currentY + 6);
            
            currentX += badgeWidth + 10;
        });
        doc.y = currentY + 30;
    };

    // --- 5 & 6. SKILLS ---
    drawSectionTitle('Matched Skills');
    drawBadges(data.matchedSkills, '#D1FAE5', '#065F46', '#34D399'); // Green chips

    drawSectionTitle('Missing Skills');
    drawBadges(data.missingSkills, '#FEE2E2', '#991B1B', '#F87171'); // Red chips

    // --- HELPER: BULLET / NUMBERED LISTS ---
    const drawList = (items, type = 'bullet') => {
        if (!items || items.length === 0) {
            doc.fontSize(11).fillColor(colors.textMuted).text('None recorded.');
            return;
        }

        items.forEach((item, index) => {
            checkPageBreak(40);
            const bullet = type === 'bullet' ? '•' : type === 'check' ? '✓' : type === 'warning' ? '⚠' : `${index + 1}.`;
            const bulletColor = type === 'check' ? colors.success : type === 'warning' ? colors.danger : colors.textMain;

            doc.font('Helvetica-Bold').fontSize(12).fillColor(bulletColor).text(bullet, leftMargin + 10, doc.y);
            doc.font('Helvetica').fillColor(colors.textMain).text(item, leftMargin + 35, doc.y - 14, {
                lineGap: 4,
                width: contentWidth - 35
            });
            doc.moveDown(0.5);
        });
    };

    // --- 7, 8, 9, 10. LIST SECTIONS ---
    drawSectionTitle('Strengths');
    drawList(data.strengths, 'check');

    drawSectionTitle('Weaknesses');
    drawList(data.weaknesses, 'warning');

    drawSectionTitle('AI Feedback & Recommendations');
    drawList(data.feedback, 'number');

    drawSectionTitle('Suggested Interview Questions');
    drawList(data.interviewQuestions, 'number');

    // --- 11. GLOBAL FOOTER ---
    // PDFKit lets us iterate over buffered pages before finalizing the doc
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(9)
           .fillColor(colors.textMuted)
           .font('Helvetica')
           .text(
               `ResuMax | AI Resume Analysis Report | Page ${i + 1} of ${pages.count}`,
               leftMargin,
               doc.page.height - 35,
               { align: 'center', width: contentWidth }
           );
        // Top border for footer
        doc.lineWidth(1).strokeColor(colors.border).moveTo(leftMargin, doc.page.height - 45).lineTo(pageWidth - rightMargin, doc.page.height - 45).stroke();
    }

    // Finalize the PDF file
    doc.end();
}

module.exports = { generateATSReportPDF };