/// <reference lib="dom" />
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, cameraOutline, scanOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon, IonSpinner
  ]
})
export class ScanPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  sections: any[]   = [];
  subjects: any[]   = [];
  answerKeys: any[] = [];
  students: any[]   = [];

  selectedSection     = '';
  selectedSubject     = '';
  selectedAnswerKeyId = '';
  selectedAnswerKey: any = null;
  selectedStudent     = '';

  imagePreview: string | null = null;
  imageFile: File | null      = null;

  isScanning   = false;
  ocrDone      = false;
  scanStatus   = '';
  scanProgress = 0;
  imageQualityTips: string[] = [];

  detectedAnswers: {
    num: number; detected: string; correct: string; isCorrect: boolean; method?: string;
    isEssay?: boolean; essayScore?: number; essayMax?: number;
  }[] = [];

  score = 0; total = 0; percentage = 0; scored = false; isSaving = false;

  useAI = true;

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, cameraOutline, scanOutline });
  }

  ngOnInit() {
    this.api.getSections().subscribe({
      next: (d: any) => this.sections = d,
      error: () => this.toast('Could not load sections', 'danger')
    });
    this.api.getSubjects().subscribe({
      next: (d: any) => this.subjects = d,
      error: () => this.toast('Could not load subjects', 'danger')
    });
  }

  onSectionChange() {
    this.selectedSubject = ''; this.selectedAnswerKeyId = '';
    this.selectedAnswerKey = null; this.selectedStudent = '';
    this.answerKeys = []; this.students = [];
    if (this.selectedSection)
      this.api.getStudents(parseInt(this.selectedSection))
        .subscribe({ next: (d: any) => this.students = d });
  }

  onSubjectChange() {
    this.selectedAnswerKeyId = ''; this.selectedAnswerKey = null; this.answerKeys = [];
    if (this.selectedSection && this.selectedSubject)
      this.api.getAnswerKeys(parseInt(this.selectedSection), parseInt(this.selectedSubject)).subscribe({
        next: (d: any) => { this.answerKeys = d ?? []; if (!this.answerKeys.length) this.toast('No answer keys found', 'warning'); },
        error: () => this.toast('Could not load answer keys', 'danger')
      });
  }

  onAnswerKeyChange() {
    this.selectedAnswerKey = this.answerKeys.find((a: any) => a.id == this.selectedAnswerKeyId) || null;
    this.reset();
  }

  getCorrectAnswers(): string[] {
    if (!this.selectedAnswerKey?.answers) return [];
    try {
      const parsed = JSON.parse(this.selectedAnswerKey.answers);
      return parsed.map((a: any) => {
        const ans = (typeof a === 'object' ? (a.answer || '') : a).toString().trim().toUpperCase();
        return ans || 'ESSAY';
      });
    } catch { return []; }
  }

  triggerUpload() { this.fileInput.nativeElement.click(); }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.imageFile = file;
    this.ocrDone = false; this.scored = false; this.detectedAnswers = [];
    this.imageQualityTips = [];
    const reader = new FileReader();
    reader.onload = (e: any) => { this.imagePreview = e.target.result; };
    reader.readAsDataURL(file);
    this.analyzeImageQuality(file).catch(() => {});
  }

  removeImage() {
    this.imagePreview = null; this.imageFile = null;
    this.ocrDone = false; this.scored = false;
    this.detectedAnswers = []; this.imageQualityTips = [];
  }

  // ══════════════════════════════════════════════════
  // MAIN SCAN — Pure OMR bubble detection
  // No AI, no API, 100% free and offline
  // ══════════════════════════════════════════════════
  async startScan() {
    if (!this.imageFile)           { this.toast('Please upload an image first', 'warning'); return; }
    if (!this.selectedAnswerKeyId) { this.toast('Please select an answer key', 'warning'); return; }
    if (!this.selectedStudent)     { this.toast('Please select a student', 'warning'); return; }

    const correctAnswers = this.getCorrectAnswers();
    if (!correctAnswers.length) { this.toast('Answer key has no answers', 'warning'); return; }

    this.isScanning = true; this.ocrDone = false;
    this.scored = false; this.scanProgress = 0;

    try {
      if (this.useAI) {
        await this.scanWithOpenAI(correctAnswers);
        return;
      }

      this.scanStatus = 'Loading image...';
      this.scanProgress = 10;
      const canvas = await this.loadImageToCanvas(this.imageFile);

      this.scanStatus = 'Finding corner anchors...';
      this.scanProgress = 25;
      const corners = this.findCornerAnchors(canvas);

      this.scanStatus = 'Detecting bubbles...';
      this.scanProgress = 50;

      let detected: string[];
      if (corners) {
        detected = this.detectBubblesAligned(canvas, corners, correctAnswers);
      } else {
        // No corners found — use grid-based detection
        this.toast('Corner anchors not found — using grid detection', 'warning');
        detected = this.detectBubblesGrid(canvas, correctAnswers);
      }

      this.scanProgress = 90;
      this.scanStatus   = 'Building results...';

      this.detectedAnswers = correctAnswers.map((correct, i) => {
        const isEssay = correct === 'ESSAY';
        return {
          num: i + 1,
          detected: isEssay ? 'ESSAY' : (detected[i] || '?'),
          correct,
          isCorrect: !isEssay && detected[i] !== '?' && detected[i].toUpperCase() === correct.toUpperCase(),
          isEssay,
          essayScore: isEssay ? 0 : undefined,
          essayMax:   isEssay ? 10 : undefined
        };
      });

      this.scanProgress = 100;
      this.isScanning   = false;
      this.ocrDone      = true;

      const missing = this.detectedAnswers.filter(a => a.detected === '?').length;
      const detected_count = this.detectedAnswers.filter(a => a.detected !== '?').length;

      if (missing === correctAnswers.length)
        this.toast('No bubbles detected. Make sure to use the OMR Answer Sheet!', 'warning');
      else if (missing > 0)
        this.toast(`${detected_count} detected, ${missing} unclear. Fix using text boxes.`, 'warning');
      else
        this.toast('All bubbles detected! Review then Calculate Score.', 'success');

    } catch (err: any) {
      this.isScanning = false;
      this.toast('Scan failed: ' + (err.message || 'Unknown error'), 'danger');
    }
  }

  // ══════════════════════════════════════════════════
  // LOAD IMAGE TO CANVAS — grayscale + high contrast
  // ══════════════════════════════════════════════════
  async loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxW  = 1600;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.filter = 'grayscale(100%) contrast(2.8) brightness(1.1)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.src = url;
    });
  }

  // ══════════════════════════════════════════════════
  // FIND CORNER ANCHORS
  // Looks for solid black squares in the 4 corners
  // These are the fixed squares printed on the OMR sheet
  // ══════════════════════════════════════════════════
  findCornerAnchors(canvas: HTMLCanvasElement): { tl: {x:number,y:number}, tr: {x:number,y:number}, bl: {x:number,y:number}, br: {x:number,y:number} } | null {
    const ctx  = canvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const w = canvas.width;
    const h = canvas.height;

    // Search in corner regions (10% of image dimensions)
    const margin = Math.floor(Math.min(w, h) * 0.12);

    const findAnchor = (xStart: number, xEnd: number, yStart: number, yEnd: number) => {
      let bestX = -1, bestY = -1, bestScore = 0;
      const step = 4;

      for (let y = yStart; y < yEnd - 20; y += step) {
        for (let x = xStart; x < xEnd - 20; x += step) {
          // Count dark pixels in 20x20 area
          let dark = 0;
          for (let dy = 0; dy < 20; dy++) {
            for (let dx = 0; dx < 20; dx++) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              if (data[idx] < 80) dark++;
            }
          }
          const score = dark / 400;
          if (score > bestScore && score > 0.6) {
            bestScore = score; bestX = x + 10; bestY = y + 10;
          }
        }
      }
      return bestX > 0 ? { x: bestX, y: bestY } : null;
    };

    const tl = findAnchor(0, margin, 0, margin);
    const tr = findAnchor(w - margin, w, 0, margin);
    const bl = findAnchor(0, margin, h - margin, h);
    const br = findAnchor(w - margin, w, h - margin, h);

    if (tl && tr && bl && br) return { tl, tr, bl, br };
    return null;
  }

  // ══════════════════════════════════════════════════
  // DETECT BUBBLES WITH ANCHOR ALIGNMENT
  // Uses corner anchors to precisely locate bubble grid
  // ══════════════════════════════════════════════════
  detectBubblesAligned(
    canvas: HTMLCanvasElement,
    corners: { tl: {x:number,y:number}, tr: {x:number,y:number}, bl: {x:number,y:number}, br: {x:number,y:number} },
    correctAnswers: string[]
  ): string[] {
    const ctx  = canvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const w    = canvas.width;
    const total = correctAnswers.length;

    // Sheet layout constants (as fraction of sheet dimensions)
    // Bubble grid starts at ~35% from top (after header+info+instructions)
    // Each row is ~(55% of height) / total rows
    const gridTop    = corners.tl.y + (corners.bl.y - corners.tl.y) * 0.30;
    const gridBottom = corners.tl.y + (corners.bl.y - corners.tl.y) * 0.92;
    const rowHeight  = (gridBottom - gridTop) / total;

    // X positions of bubble columns (A B C D for MC, T F for TF)
    // Bubbles start at ~20% from left, each bubble is ~8% width apart
    const gridLeft  = corners.tl.x + (corners.tr.x - corners.tl.x) * 0.18;
    const gridWidth = corners.tr.x - corners.tl.x;
    const bubbleSpacing = gridWidth * 0.09;

    const results: string[] = [];

    for (let i = 0; i < total; i++) {
      const corrUp = correctAnswers[i].toUpperCase();
      const rowY   = gridTop + (i + 0.5) * rowHeight;

      if (corrUp === 'TRUE' || corrUp === 'FALSE') {
        // T/F — 2 bubbles
        const positions = [
          { x: gridLeft, label: 'True' },
          { x: gridLeft + bubbleSpacing, label: 'False' }
        ];
        results.push(this.readBubbleGroup(data, w, canvas.height, rowY, positions, rowHeight * 0.4));

      } else if (['A','B','C','D'].includes(corrUp)) {
        // MC — 4 bubbles
        const positions = [
          { x: gridLeft,                      label: 'A' },
          { x: gridLeft + bubbleSpacing,       label: 'B' },
          { x: gridLeft + bubbleSpacing * 2,   label: 'C' },
          { x: gridLeft + bubbleSpacing * 3,   label: 'D' },
        ];
        results.push(this.readBubbleGroup(data, w, canvas.height, rowY, positions, rowHeight * 0.4));

      } else {
        // Identification — no bubbles, mark as ?
        results.push('?');
      }
    }

    return results;
  }

  // ══════════════════════════════════════════════════
  // DETECT BUBBLES GRID (fallback — no anchors)
  // Divides image into equal rows and scans each
  // ══════════════════════════════════════════════════
  detectBubblesGrid(canvas: HTMLCanvasElement, correctAnswers: string[]): string[] {
    const ctx   = canvas.getContext('2d')!;
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const w     = canvas.width;
    const h     = canvas.height;
    const total = correctAnswers.length;

    // Skip top 30% (header area) and bottom 8% (score box)
    const startY = h * 0.30;
    const endY   = h * 0.92;
    const rowH   = (endY - startY) / total;

    // Bubble columns start at 20% from left
    const xStart = w * 0.20;
    const xStep  = w * 0.09;

    const results: string[] = [];

    for (let i = 0; i < total; i++) {
      const corrUp = correctAnswers[i].toUpperCase();
      const rowY   = startY + (i + 0.5) * rowH;

      if (corrUp === 'TRUE' || corrUp === 'FALSE') {
        const positions = [
          { x: xStart,          label: 'True'  },
          { x: xStart + xStep,  label: 'False' }
        ];
        results.push(this.readBubbleGroup(data, w, h, rowY, positions, rowH * 0.4));
      } else if (['A','B','C','D'].includes(corrUp)) {
        const positions = [
          { x: xStart,              label: 'A' },
          { x: xStart + xStep,      label: 'B' },
          { x: xStart + xStep * 2,  label: 'C' },
          { x: xStart + xStep * 3,  label: 'D' },
        ];
        results.push(this.readBubbleGroup(data, w, h, rowY, positions, rowH * 0.4));
      } else {
        results.push('?');
      }
    }

    return results;
  }

  // ══════════════════════════════════════════════════
  // READ BUBBLE GROUP
  // For each bubble position, count dark pixels
  // The darkest bubble = filled = student's answer
  // ══════════════════════════════════════════════════
  readBubbleGroup(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    rowY: number,
    positions: { x: number, label: string }[],
    radius: number
  ): string {
    let maxDark = 0;
    let best    = '?';
    const r     = Math.floor(radius);

    for (const pos of positions) {
      const cx = Math.floor(pos.x);
      const cy = Math.floor(rowY);
      let dark = 0, total = 0;

      // Sample pixels in a circular area around bubble center
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue; // circular mask
          const px = cx + dx;
          const py = cy + dy;
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const idx = (py * w + px) * 4;
          if (data[idx] < 100) dark++; // dark pixel threshold
          total++;
        }
      }

      const ratio = total > 0 ? dark / total : 0;
      if (ratio > maxDark) { maxDark = ratio; best = pos.label; }
    }

    // Only count as filled if darkness ratio exceeds threshold
    // Empty bubble = ~5-10% dark, Filled = 40%+ dark
    return maxDark > 0.30 ? best : '?';
  }

  // ══════════════════════════════════════════════════
  // IMAGE QUALITY ANALYZER
  // ══════════════════════════════════════════════════
  async analyzeImageQuality(file: File): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale  = img.width > 400 ? 400 / img.width : 1;
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const d    = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const tips: string[] = [];
        let totalB = 0, dark = 0, pCount = d.length / 4;
        const bList: number[] = [];

        for (let i = 0; i < d.length; i += 4) {
          const b = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
          totalB += b; bList.push(b);
          if (b < 60) dark++;
        }

        const avg = totalB / pCount;
        let varSum = 0;
        for (const b of bList) varSum += Math.pow(b - avg, 2);
        const contrast = Math.sqrt(varSum / pCount);

        if (avg < 80)    tips.push('⚠️ Too dark — move to brighter lighting');
        if (avg > 210)   tips.push('⚠️ Too bright — avoid direct sunlight');
        if (contrast < 25) tips.push('⚠️ Low contrast — fill bubbles more firmly');
        if (dark / pCount > 0.45) tips.push('⚠️ Large dark area — make sure sheet is fully visible');
        if (tips.length === 0) tips.push('✅ Image quality looks good!');

        this.imageQualityTips = tips;
        resolve();
      };
      img.src = url;
    });
  }

  onAnswerChange(item: any) {
    item.isCorrect = item.detected !== '?' &&
      item.detected.toUpperCase() === item.correct.toUpperCase();
  }

  calculateScore() {
    let autoScore = 0;
    let essayScore = 0;
    this.detectedAnswers.forEach(a => {
      if (a.isEssay) {
        essayScore += (a.essayScore || 0);
      } else {
        a.isCorrect = a.detected !== '?' && a.detected.toUpperCase() === a.correct.toUpperCase();
        if (a.isCorrect) autoScore++;
      }
    });
    this.score      = autoScore + essayScore;
    this.total      = this.detectedAnswers.length;
    this.percentage = this.total > 0 ? Math.round((this.score / this.total) * 100) : 0;
    this.scored     = true;
  }

  onEssayScoreChange(item: any) {
    if (item.essayScore < 0)            item.essayScore = 0;
    if (item.essayScore > item.essayMax) item.essayScore = item.essayMax;
  }

  getMissingCount()  { return this.detectedAnswers.filter(a => a.detected === '?').length; }
  getDetectedCount() { return this.detectedAnswers.filter(a => a.detected !== '?').length; }

  getGrade() {
    if (this.percentage >= 90) return 'A';
    if (this.percentage >= 80) return 'B';
    if (this.percentage >= 70) return 'C';
    if (this.percentage >= 60) return 'D';
    return 'F';
  }
  getGradeClass() {
    if (this.percentage >= 80) return 'high';
    if (this.percentage >= 60) return 'mid';
    return 'low';
  }

  async saveRecord() {
    if (!this.selectedStudent || !this.selectedSection || !this.selectedSubject) {
      this.toast('Missing required selections', 'danger'); return;
    }
    this.isSaving = true;
    this.api.addRecord({
      student_id:    parseInt(this.selectedStudent),
      section_id:    parseInt(this.selectedSection),
      subject_id:    parseInt(this.selectedSubject),
      answer_key_id: parseInt(this.selectedAnswerKeyId),
      score:         this.score,
      total:         this.total,
      percentage:    this.percentage
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast('Record saved! Select next student to scan.', 'success');
        this.imagePreview = null; this.imageFile = null;
        this.ocrDone = false; this.scored = false;
        this.detectedAnswers = [];
        this.score = 0; this.total = 0; this.percentage = 0;
        this.scanProgress = 0; this.imageQualityTips = [];
        this.selectedStudent = '';
      },
      error: () => { this.isSaving = false; this.toast('Could not save record', 'danger'); }
    });
  }

  reset() {
    this.imagePreview = null; this.imageFile = null;
    this.ocrDone = false; this.scored = false;
    this.detectedAnswers = [];
    this.score = 0; this.total = 0; this.percentage = 0;
    this.scanProgress = 0; this.imageQualityTips = [];
  }

  async toast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 4000, color, position: 'bottom' });
    t.present();
  }

  // ══════════════════════════════════════════════════
  // AI SCAN — Calls backend proxy (key stored on Railway)
  // ══════════════════════════════════════════════════
  async scanWithOpenAI(correctAnswers: string[]): Promise<void> {
    this.scanStatus  = 'Preparing image for AI...';
    this.scanProgress = 20;

    const { base64Data, mimeType } = await this.compressImage(this.imageFile!);

    const qTypes = correctAnswers.map((ans, i) => {
      const up = ans.toUpperCase();
      if (up === 'ESSAY')                  return `Q${i + 1}: Essay (skip — return "ESSAY")`;
      if (up === 'TRUE' || up === 'FALSE') return `Q${i + 1}: True/False`;
      if (['A','B','C','D'].includes(up))  return `Q${i + 1}: Multiple Choice (A, B, C, or D)`;
      return `Q${i + 1}: Identification (read the handwritten text on the answer line)`;
    }).join('\n');

    this.scanStatus  = 'Analyzing with OpenAI Vision...';
    this.scanProgress = 50;

    const apiUrl = (window as any).API_URL || 'https://thesis-project-production-0338.up.railway.app/api';
    const token  = localStorage.getItem('token') || '';

    const response = await fetch(`${apiUrl}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        imageBase64:    base64Data,
        mimeType,
        questionTypes:  qTypes,
        totalQuestions: correctAnswers.length
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || `Scan error: ${response.status}`);
    }

    const data = await response.json();
    const detected: string[] = data.detected;
    if (!detected || detected.length !== correctAnswers.length)
      throw new Error(`AI returned ${detected?.length ?? 0} answers, expected ${correctAnswers.length}.`);

    this.scanProgress = 90;
    this.scanStatus   = 'Building results...';

    this.detectedAnswers = correctAnswers.map((correct, i) => {
      const isEssay = correct === 'ESSAY';
      const det     = isEssay ? 'ESSAY' : (detected[i] || '?').toString().trim();
      const up      = correct.toUpperCase();
      const isId    = !['A','B','C','D','TRUE','FALSE','ESSAY'].includes(up);
      return {
        num: i + 1,
        detected: det,
        correct,
        isCorrect: !isEssay && det !== '?' && det.toUpperCase() === correct.toUpperCase(),
        method:    isEssay ? undefined : (isId ? 'AI-OCR' : 'AI-OMR'),
        isEssay,
        essayScore: isEssay ? 0 : undefined,
        essayMax:   isEssay ? 10 : undefined
      };
    });

    this.scanProgress = 100;
    this.isScanning   = false;
    this.ocrDone      = true;

    const missing = this.detectedAnswers.filter(a => a.detected === '?').length;
    if (missing > 0)
      this.toast(`AI scan done. ${missing} unclear — fix using text boxes.`, 'warning');
    else
      this.toast('AI scan complete! Review then Calculate Score.', 'success');
  }

  private compressImage(file: File): Promise<{ base64Data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxW = 1200;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ base64Data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  goBack() { this.router.navigate(['/dashboard']); }
}