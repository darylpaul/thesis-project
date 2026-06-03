import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../../environments/environment';

const BASE = API_URL;

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    });
  }

  // ── Auth ──────────────────────────────────────────────
  login(email: string, password: string) {
    return this.http.post(`${BASE}/login`, { email, password });
  }

  signup(fullname: string, email: string, password: string) {
    return this.http.post(`${BASE}/signup`, { fullname, email, password });
  }

  // ── Sections ──────────────────────────────────────────
  getSections() {
    return this.http.get(`${BASE}/sections`, { headers: this.headers() });
  }
  addSection(data: object) {
    return this.http.post(`${BASE}/sections`, data, { headers: this.headers() });
  }
  updateSection(id: number, data: object) {
    return this.http.put(`${BASE}/sections/${id}`, data, { headers: this.headers() });
  }
  deleteSection(id: number) {
    return this.http.delete(`${BASE}/sections/${id}`, { headers: this.headers() });
  }

  // ── Students ──────────────────────────────────────────
  getStudents(sectionId?: number) {
    const url = sectionId ? `${BASE}/students?section_id=${sectionId}` : `${BASE}/students`;
    return this.http.get(url, { headers: this.headers() });
  }
  addStudent(data: object) {
    return this.http.post(`${BASE}/students`, data, { headers: this.headers() });
  }
  updateStudent(id: number, data: object) {
    return this.http.put(`${BASE}/students/${id}`, data, { headers: this.headers() });
  }
  deleteStudent(id: number) {
    return this.http.delete(`${BASE}/students/${id}`, { headers: this.headers() });
  }

  // ── Subjects ──────────────────────────────────────────
  getSubjects() {
    return this.http.get(`${BASE}/subjects`, { headers: this.headers() });
  }
  addSubject(data: object) {
    return this.http.post(`${BASE}/subjects`, data, { headers: this.headers() });
  }
  updateSubject(id: number, data: object) {
    return this.http.put(`${BASE}/subjects/${id}`, data, { headers: this.headers() });
  }
  deleteSubject(id: number) {
    return this.http.delete(`${BASE}/subjects/${id}`, { headers: this.headers() });
  }

  // ── Questionnaires ────────────────────────────────────
  getQuestionnaires(sectionId?: number, subjectId?: number) {
    const params: string[] = [];
    if (sectionId) params.push(`section_id=${sectionId}`);
    if (subjectId) params.push(`subject_id=${subjectId}`);
    const url = `${BASE}/questionnaires${params.length ? '?' + params.join('&') : ''}`;
    return this.http.get(url, { headers: this.headers() });
  }
  getQuestionnaire(id: number) {
    return this.http.get(`${BASE}/questionnaires/${id}`, { headers: this.headers() });
  }
  addQuestionnaire(data: object) {
    return this.http.post(`${BASE}/questionnaires`, data, { headers: this.headers() });
  }
  updateQuestionnaire(id: number, data: object) {
    return this.http.put(`${BASE}/questionnaires/${id}`, data, { headers: this.headers() });
  }
  deleteQuestionnaire(id: number) {
    return this.http.delete(`${BASE}/questionnaires/${id}`, { headers: this.headers() });
  }
  duplicateQuestionnaire(id: number) {
    return this.http.post(`${BASE}/questionnaires/${id}/duplicate`, {}, { headers: this.headers() });
  }

  // ── Answer Keys ───────────────────────────────────────
  getAnswerKeys(sectionId?: number, subjectId?: number) {
    const params: string[] = [];
    if (sectionId) params.push(`section_id=${sectionId}`);
    if (subjectId) params.push(`subject_id=${subjectId}`);
    const url = `${BASE}/answerkeys${params.length ? '?' + params.join('&') : ''}`;
    return this.http.get(url, { headers: this.headers() });
  }
  addAnswerKey(data: object) {
    return this.http.post(`${BASE}/answerkeys`, data, { headers: this.headers() });
  }
  updateAnswerKey(id: number, data: object) {
    return this.http.put(`${BASE}/answerkeys/${id}`, data, { headers: this.headers() });
  }
  syncAnswerKey(questionnaireId: number, data: object) {
    return this.http.put(`${BASE}/answerkeys/sync/${questionnaireId}`, data, { headers: this.headers() });
  }
  deleteAnswerKey(id: number) {
    return this.http.delete(`${BASE}/answerkeys/${id}`, { headers: this.headers() });
  }

  // ── Stats ─────────────────────────────────────────────
  getTeacherStats() {
    return this.http.get(`${BASE}/teacher/stats`, { headers: this.headers() });
  }

  // ── Auth ──────────────────────────────────────────
  verifyPassword(password: string) {
    return this.http.post(`${BASE}/verify-password`, { password }, { headers: this.headers() });
  }

  // ── Records ───────────────────────────────────────────
  getRecords(sectionId?: number, subjectId?: number) {
    let url = `${BASE}/records`;
    if (sectionId && subjectId) {
      url += `?section_id=${sectionId}&subject_id=${subjectId}`;
    }
    return this.http.get(url, { headers: this.headers() });
  }
  addRecord(data: object) {
    return this.http.post(`${BASE}/records`, data, { headers: this.headers() });
  }
  deleteRecord(id: number) {
    return this.http.delete(`${BASE}/records/${id}`, { headers: this.headers() });
  }

  // ── Test Bank ─────────────────────────────────────────
  getTestBank(subjectId?: number, topic?: string) {
    let url = `${BASE}/test-bank`;
    const params: string[] = [];
    if (subjectId) params.push(`subject_id=${subjectId}`);
    if (topic)     params.push(`topic=${encodeURIComponent(topic)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get(url, { headers: this.headers() });
  }

  getTestBankTopics(subjectId: number) {
    return this.http.get(`${BASE}/test-bank/topics?subject_id=${subjectId}`, { headers: this.headers() });
  }

  suggestTestBank(data: object) {
    return this.http.post(`${BASE}/test-bank`, data, { headers: this.headers() });
  }

  approveTestBank(id: number) {
    return this.http.put(`${BASE}/test-bank/${id}/approve`, {}, { headers: this.headers() });
  }

  updateTestBank(id: number, data: object) {
    return this.http.put(`${BASE}/test-bank/${id}`, data, { headers: this.headers() });
  }

  deleteTestBank(id: number) {
    return this.http.delete(`${BASE}/test-bank/${id}`, { headers: this.headers() });
  }
}
