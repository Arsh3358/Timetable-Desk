import { Router } from 'express';
import PDFDocument from 'pdfkit';
import db from '../db.js';

const router = Router();
const COLLEGE = process.env.COLLEGE_NAME || 'Your College Name';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['9:00', '10:00', '11:00', '12:00', '1:30', '2:30', '3:30', '4:30'];
const KEY = { cls: 'class_id', fac: 'faculty_id', ven: 'venue_id' };
const LABEL = { cls: 'Class', fac: 'Teacher', ven: 'Venue' };

// GET /api/export/timetable.pdf?mode=cls|fac|ven[&semester=3][&id=1]
router.get('/export/timetable.pdf', (req, res) => {
  const mode = KEY[req.query.mode] ? req.query.mode : 'cls';
  const sem = Number(req.query.semester) || null;
  let entities;
  if (mode === 'cls') {
    entities = db.prepare(`SELECT c.id, c.semester, d.name || ', Semester ' || c.semester || ', Section ' || c.section AS name
      FROM classes c JOIN departments d ON d.id=c.department_id ORDER BY c.semester, d.id, c.section`).all();
    if (sem) entities = entities.filter((e) => e.semester === sem);
  } else {
    entities = db.prepare(`SELECT * FROM ${mode === 'fac' ? 'faculty' : 'venues'} ORDER BY id`).all();
  }
  if (req.query.id) entities = entities.filter((e) => e.id === Number(req.query.id));

  const rows = db.prepare(`SELECT t.*, s.name AS subject, f.name AS teacher, v.name AS venue,
      d.name || ' Sem ' || c.semester || '-' || c.section AS cls
      FROM timetable t JOIN subjects s ON s.id=t.subject_id JOIN faculty f ON f.id=t.faculty_id
      JOIN venues v ON v.id=t.venue_id JOIN classes c ON c.id=t.class_id JOIN departments d ON d.id=c.department_id`).all();

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="timetable.pdf"');
  doc.pipe(res);

  const W = 841.89, x0 = 30, y0 = 104, dayW = 50, colW = (W - 60 - dayW) / 8, headH = 30, rowH = 58;
  if (!entities.length) doc.fontSize(14).text('No data to export yet.');
  entities.forEach((e, i) => {
    if (i) doc.addPage();
    doc.rect(0, 0, W, 84).fill('#14213D');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text(COLLEGE, x0, 26, { width: 380 });
    doc.fillColor('#B8C2DB').font('Helvetica').fontSize(10).text('Timetable Desk', x0, 52);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(`${LABEL[mode]} timetable`, 430, 22, { width: W - 460, align: 'right' });
    doc.fillColor('#D6DDEF').font('Helvetica').fontSize(11).text(e.name, 430, 44, { width: W - 460, align: 'right' });
    doc.fillColor('#5B6785').fontSize(8.5).text(`Generated ${new Date().toLocaleDateString()}  |  Lunch break after P4`, x0, 90);

    TIMES.forEach((t, p) => {
      doc.rect(x0 + dayW + p * colW, y0, colW, headH).fillAndStroke('#EEF1F6', '#D9DEE9');
      doc.fillColor('#14213D').fontSize(8).font('Helvetica-Bold').text(`P${p + 1}  ${t}`, x0 + dayW + p * colW, y0 + 11, { width: colW, align: 'center' });
    });
    DAYS.forEach((d, di) => {
      const y = y0 + headH + di * rowH;
      doc.rect(x0, y, dayW, rowH).fillAndStroke('#EEF1F6', '#D9DEE9');
      doc.fillColor('#14213D').fontSize(9).font('Helvetica-Bold').text(d, x0, y + rowH / 2 - 5, { width: dayW, align: 'center' });
      for (let p = 0; p < 8; p++) {
        const x = x0 + dayW + p * colW;
        const hit = rows.find((r) => r.day === di && r.period === p && r[KEY[mode]] === e.id);
        doc.rect(x, y, colW, rowH).fillAndStroke(hit ? '#E8EDFA' : '#FFFFFF', '#D9DEE9');
        if (hit) {
          const second = mode === 'cls' ? `${hit.teacher} / ${hit.venue}` : mode === 'fac' ? `${hit.cls} / ${hit.venue}` : `${hit.teacher} / ${hit.cls}`;
          doc.fillColor('#14213D').font('Helvetica-Bold').fontSize(7.5).text(hit.subject, x + 3, y + 4, { width: colW - 6, height: 22, ellipsis: true });
          doc.fillColor('#5B6785').font('Helvetica').fontSize(6.5).text(second, x + 3, y + 28, { width: colW - 6, height: 26, ellipsis: true });
        }
      }
    });
  });
  doc.end();
});

export default router;
