import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { reportApi, api } from '../services/api';

const getUser = () => { try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; } };

const MONTHS = [
  { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' },
  { value: 3, label: 'Tháng 3' }, { value: 4, label: 'Tháng 4' },
  { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
  { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' },
  { value: 9, label: 'Tháng 9' }, { value: 10, label: 'Tháng 10' },
  { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' }
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

const REPORT_COLORS = {
  attendance: '#3b82f6',
  payroll: '#10b981',
  performance: '#8b5cf6',
  coverage: '#f59e0b',
  summary: '#ef4444'
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const fmt = (n, dec = 0) => {
  if (n == null) return '0';
  return Number(n).toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

const fmtCurrency = (n) => {
  if (n == null) return '0đ';
  return Number(n).toLocaleString('vi-VN') + 'đ';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      {label && <div style={{ color: '#fff', fontWeight: '600', marginBottom: '6px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff' }}>
          {p.name}: {typeof p.value === 'number' ? (p.value > 1000 ? fmtCurrency(p.value) : fmt(p.value)) : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── Mini Chart Components ───────────────────────────────────────────────────

const PieChartCard = ({ data, title, width = 280, height = 220 }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {title && <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={data[i]?.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Tổng: {total}
      </div>
    </div>
  );
};

const BarChartCard = ({ data, title, dataKey = 'value', nameKey = 'name', height = 220, horizontal = false }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {title && <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          {horizontal
            ? <><XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} /><YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} /></>
            : <><XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#9ca3af' }} /><YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} /></>
          }
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill={REPORT_COLORS.summary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const LineChartCard = ({ data, title, height = 220 }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {title && <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Giờ" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, color = '#fff', small = false }) => (
  <div className="glass-card" style={{ padding: small ? '14px' : '20px', textAlign: 'center' }}>
    <div style={{ fontSize: small ? '22px' : '28px', marginBottom: '6px' }}>{icon}</div>
    <div style={{ fontSize: small ? '18px' : '22px', fontWeight: '700', color }}>{value}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
  </div>
);

// ─── Attendance Report ────────────────────────────────────────────────────────

const AttendanceReport = ({ data, onExport, loading }) => {
  if (!data) return null;
  const { stats, summary, byStaff, deptBreakdown, chartData } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
        <StatCard icon="🕐" label="Tổng bản ghi" value={summary?.totalRecords || 0} color="#3b82f6" />
        <StatCard icon="⏱️" label="Tổng giờ" value={`${fmt(summary?.totalHours || 0)}h`} color="#10b981" />
        <StatCard icon="😊" label="Đúng giờ" value={`${summary?.onTimeRate || 0}%`} color="#10b981" />
        <StatCard icon="⏰" label="Muộn" value={`${summary?.lateRate || 0}%`} color="#f59e0b" />
        <StatCard icon="📋" label="Chấm công" value={`${summary?.attendanceRate || 0}%`} color="#8b5cf6" />
        <StatCard icon="👤" label="Giờ TB/NV" value={`${fmt(summary?.avgHoursPerStaff || 0)}h`} color="#06b6d4" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <PieChartCard data={chartData?.attendanceRate} title="Tỷ lệ trạng thái chấm công" />
        <BarChartCard data={deptBreakdown?.map(d => ({ name: d.dept, value: Math.round(d.totalHours) })) || []} title="Giờ làm theo bộ phận" height={220} />
      </div>

      {/* Staff Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Chi tiết theo nhân viên</h4>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={onExport}>📥 Xuất Excel</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>NHÂN VIÊN</th><th>VAI TRÒ</th><th>GIỜ LÀM</th><th>ĐÚNG GIỜ</th><th>MUỘN</th><th>NGHỈ</th><th>TỶ LỆ</th>
              </tr>
            </thead>
            <tbody>
              {byStaff?.map(s => (
                <tr key={s.staffId}>
                  <td style={{ fontWeight: '600', color: '#fff' }}>{s.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.role || '—'}</td>
                  <td style={{ color: '#fff' }}>{fmt(s.totalHours)}h</td>
                  <td style={{ color: 'var(--success)' }}>{s.onTimeCount}</td>
                  <td style={{ color: s.lateCount > 3 ? 'var(--danger)' : 'var(--text-secondary)' }}>{s.lateCount}</td>
                  <td style={{ color: s.absentDays > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{s.absentDays}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${s.attendanceRate}%`, height: '100%', background: s.attendanceRate >= 80 ? 'var(--success)' : s.attendanceRate >= 60 ? '#f59e0b' : 'var(--danger)', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#fff', minWidth: '36px' }}>{s.attendanceRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Payroll Report ───────────────────────────────────────────────────────────

const PayrollReport = ({ data, onExport }) => {
  if (!data) return null;
  const { payrolls, summary, byDept, chartData } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <StatCard icon="💰" label="Tổng lương Net" value={fmtCurrency(summary?.totalNet || 0)} color="#10b981" small />
        <StatCard icon="💵" label="Tổng lương Gross" value={fmtCurrency(summary?.totalGross || 0)} color="#3b82f6" small />
        <StatCard icon="📊" label="Lương TB" value={fmtCurrency(summary?.avgNetSalary || 0)} color="#8b5cf6" small />
        <StatCard icon="⏰" label="Tăng ca" value={`${fmt(summary?.totalOvertimeHours || 0)}h`} color="#f59e0b" small />
        <StatCard icon="👤" label="Số nhân viên" value={summary?.totalRecords || 0} color="#06b6d4" small />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <BarChartCard data={byDept?.map(d => ({ name: d.dept, value: Math.round(d.gross) })) || []} title="Lương Gross theo bộ phận" height={220} />
        <BarChartCard data={chartData?.topSalaries?.slice(0, 8) || []} title="Top lương cao nhất" dataKey="net" height={220} />
      </div>

      {/* Payroll Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Chi tiết lương</h4>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={onExport}>📥 Xuất Excel</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr><th>NHÂN VIÊN</th><th>BỘ PHẬN</th><th>GIỜ</th><th>TĂNG CA</th><th>PHỤ CẤP</th><th>GROSS</th><th>KHẤU TRỪ</th><th>NET</th><th>TRẠNG THÁI</th></tr>
            </thead>
            <tbody>
              {payrolls?.map(p => (
                <tr key={p.staffId}>
                  <td style={{ fontWeight: '600', color: '#fff' }}>{p.staffName}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.dept}</td>
                  <td style={{ color: '#fff' }}>{fmt(p.totalHoursWorked)}h</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt(p.overtimeHours)}h</td>
                  <td style={{ color: 'var(--success)' }}>{fmtCurrency(p.allowances)}</td>
                  <td style={{ color: '#fff' }}>{fmtCurrency(p.grossSalary)}</td>
                  <td style={{ color: 'var(--danger)' }}>{fmtCurrency(p.deductions)}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: '600' }}>{fmtCurrency(p.netSalary)}</td>
                  <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'approved' ? 'badge-muted' : 'badge-warning'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Performance Report ───────────────────────────────────────────────────────

const PerformanceReport = ({ data, onExport }) => {
  if (!data) return null;
  const { performance, summary, chartData } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
        <StatCard icon="📊" label="Điểm TB" value={`${summary?.avgScore || 0}/100`} color="#8b5cf6" />
        <StatCard icon="😊" label="Điểm chấm công TB" value={`${summary?.avgAttendanceRate || 0}%`} color="#10b981" />
        <StatCard icon="✅" label="Điểm task TB" value={`${summary?.avgTaskRate || 0}%`} color="#3b82f6" />
        <StatCard icon="🏆" label="Xuất sắc" value={summary?.excellentCount || 0} color="#10b981" />
        <StatCard icon="👍" label="Tốt" value={summary?.goodCount || 0} color="#3b82f6" />
        <StatCard icon="⚠️" label="Cần cải thiện" value={summary?.needsImprovement || 0} color="#ef4444" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <PieChartCard data={chartData?.performanceDistribution} title="Phân bổ xếp loại" height={220} />
        <BarChartCard data={chartData?.topPerformers?.slice(0, 8).map(p => ({ name: p.name, value: p.score })) || []} title="Top performers" height={220} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <PieChartCard data={chartData?.taskStatus} title="Tình trạng task" height={200} />
        <BarChartCard data={chartData?.topPerformers?.slice(0, 8).map(p => ({ name: p.name, value: p.attendance })) || []} title="Tỷ lệ chấm công" height={200} />
      </div>

      {/* Performance Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Chi tiết hiệu suất</h4>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={onExport}>📥 Xuất Excel</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr><th>XẾP HẠNG</th><th>NHÂN VIÊN</th><th>VAI TRÒ</th><th>ĐIỂM</th><th>XẾP LOẠI</th><th>CHẤM CÔNG</th><th>TASK</th><th>QUÁ HẠN</th></tr>
            </thead>
            <tbody>
              {performance?.map((p, i) => {
                const scoreColor = p.performanceScore >= 90 ? 'var(--success)' : p.performanceScore >= 75 ? '#3b82f6' : p.performanceScore >= 60 ? '#f59e0b' : 'var(--danger)';
                const ratingColor = p.rating === 'Xuất sắc' ? 'var(--success)' : p.rating === 'Tốt' ? '#3b82f6' : p.rating === 'Trung bình' ? '#f59e0b' : 'var(--danger)';
                return (
                  <tr key={p.staffId}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>#{i + 1}</td>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{p.name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.role || '—'}</td>
                    <td><span style={{ color: scoreColor, fontWeight: '700' }}>{p.performanceScore}</span></td>
                    <td><span style={{ color: ratingColor, fontWeight: '600', fontSize: '12px' }}>{p.rating}</span></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${p.attendanceRate}%`, height: '100%', background: p.attendanceRate >= 80 ? 'var(--success)' : '#f59e0b', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#fff' }}>{p.attendanceRate}%</span>
                    </div></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${p.taskCompletionRate}%`, height: '100%', background: p.taskCompletionRate >= 70 ? 'var(--success)' : '#f59e0b', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#fff' }}>{p.taskCompletionRate}%</span>
                    </div></td>
                    <td style={{ color: p.taskOverdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{p.taskOverdue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Coverage Report ──────────────────────────────────────────────────────────

const CoverageReport = ({ data, onExport }) => {
  if (!data) return null;
  const { summary, byDay, byShift, byBranch, weeklyStats, chartData } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <StatCard icon="📅" label="Tổng ca" value={summary?.totalSlots || 0} color="#f59e0b" />
        <StatCard icon="✅" label="Đã phân" value={summary?.filledSlots || 0} color="#10b981" />
        <StatCard icon="❌" label="Ca trống" value={summary?.emptySlots || 0} color="#ef4444" />
        <StatCard icon="📊" label="Coverage" value={`${summary?.coveragePercent || 0}%`} color={summary?.coveragePercent >= 80 ? '#10b981' : '#f59e0b'} />
        <StatCard icon="👥" label="Nhân viên" value={summary?.totalStaff || 0} color="#3b82f6" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <LineChartCard data={chartData?.coverageTrend || []} title="Coverage theo tuần" />
        <BarChartCard data={chartData?.coverageByDay?.map(d => ({ name: d.name, value: d.filled })) || []} title="Ca đã phân theo ngày" height={220} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <BarChartCard data={chartData?.coverageByShift?.map(d => ({ name: d.name, value: d.filled })) || []} title="Ca đã phân theo loại ca" height={200} />
        <div className="glass-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Theo bộ phận</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {byBranch?.map(b => {
              const rate = b.total > 0 ? Math.round((b.filled / b.total) * 100) : 0;
              return (
                <div key={b.branch}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#fff' }}>{b.branch}</span>
                    <span style={{ color: rate >= 80 ? 'var(--success)' : '#f59e0b' }}>{b.filled}/{b.total} ({rate}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? 'var(--success)' : '#f59e0b', transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Theo ngày</h4>
          </div>
          <table className="custom-table">
            <thead><tr><th>NGÀY</th><th>TỔNG</th><th>ĐÃ PHÂN</th><th>TRỐNG</th><th>COV%</th></tr></thead>
            <tbody>
              {byDay?.map(d => {
                const rate = d.total > 0 ? Math.round((d.filled / d.total) * 100) : 0;
                return (
                  <tr key={d.day}>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{d.day}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{d.total}</td>
                    <td style={{ color: 'var(--success)' }}>{d.filled}</td>
                    <td style={{ color: d.empty > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{d.empty}</td>
                    <td style={{ color: rate >= 80 ? 'var(--success)' : '#f59e0b', fontWeight: '600' }}>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Theo ca</h4>
          </div>
          <table className="custom-table">
            <thead><tr><th>CA</th><th>TỔNG</th><th>ĐÃ PHÂN</th><th>TRỐNG</th><th>COV%</th></tr></thead>
            <tbody>
              {byShift?.map(s => {
                const rate = s.total > 0 ? Math.round((s.filled / s.total) * 100) : 0;
                return (
                  <tr key={s.shift}>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{s.shift}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.total}</td>
                    <td style={{ color: 'var(--success)' }}>{s.filled}</td>
                    <td style={{ color: s.empty > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{s.empty}</td>
                    <td style={{ color: rate >= 80 ? 'var(--success)' : '#f59e0b', fontWeight: '600' }}>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Summary Report ──────────────────────────────────────────────────────────

const SummaryReport = ({ data, onExport }) => {
  if (!data) return null;
  const { summary, chartData } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>🕐 Chấm công</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{summary?.attendance?.totalRecords || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary?.attendance?.totalHours || 0}h làm việc · {summary?.attendance?.onTimeRate || 0}% đúng giờ
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>💰 Lương</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{fmtCurrency(summary?.payroll?.totalSalary || 0)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary?.payroll?.totalStaff || 0} NV · TB {fmtCurrency(summary?.payroll?.avgSalary || 0)}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>📋 Task</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>{summary?.tasks?.total || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary?.tasks?.completed || 0} hoàn thành · {summary?.tasks?.overdue || 0} quá hạn
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>📅 Phủ sóng</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{summary?.schedule?.coveragePercent || 0}%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary?.schedule?.filledSlots || 0}/{summary?.schedule?.totalSlots || 0} ca
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <LineChartCard data={chartData?.attendanceByDay?.map(d => ({ label: `${d.day}/${new Date().getMonth() + 1}`, hours: d.hours })) || []} title="Giờ làm theo ngày" height={220} />
        <PieChartCard data={chartData?.taskOverview} title="Tổng quan task" height={220} />
      </div>

      {/* Summary Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Task</h4>
          </div>
          <table className="custom-table">
            <thead><tr><th>TRẠNG THÁI</th><th>SỐ LƯỢNG</th><th>TỶ LỆ</th></tr></thead>
            <tbody>
              {[
                { label: 'Hoàn thành', value: summary?.tasks?.completed || 0, color: 'var(--success)' },
                { label: 'Đang làm', value: summary?.tasks?.inProgress || 0, color: '#3b82f6' },
                { label: 'Chưa làm', value: summary?.tasks?.pending || 0, color: '#f59e0b' },
                { label: 'Quá hạn', value: summary?.tasks?.overdue || 0, color: 'var(--danger)' }
              ].map(t => {
                const total = summary?.tasks?.total || 1;
                const rate = Math.round((t.value / total) * 100);
                return (
                  <tr key={t.label}>
                    <td style={{ color: t.color, fontWeight: '600' }}>{t.label}</td>
                    <td style={{ color: '#fff' }}>{t.value}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: t.color, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#fff' }}>{rate}%</span>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Chấm công</h4>
          </div>
          <table className="custom-table">
            <thead><tr><th>TRẠNG THÁI</th><th>SỐ LƯỢNG</th></tr></thead>
            <tbody>
              {[
                { label: 'Tổng bản ghi', value: summary?.attendance?.totalRecords || 0 },
                { label: 'Tổng giờ', value: `${summary?.attendance?.totalHours || 0}h` },
                { label: 'Đúng giờ', value: summary?.attendance?.onTimeRate || 0, suffix: '%' },
                { label: 'Muộn', value: summary?.attendance?.lateCount || 0 },
                { label: 'Nghỉ', value: summary?.attendance?.absentCount || 0 }
              ].map(t => (
                <tr key={t.label}>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.label}</td>
                  <td style={{ color: '#fff', fontWeight: '600' }}>{t.value}{t.suffix || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Export Functions ────────────────────────────────────────────────────────

const exportPDF = (report, reportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const addTitle = (text, y) => {
    doc.setFontSize(18);
    doc.setTextColor(225, 29, 72);
    doc.text(text, pageWidth / 2, y, { align: 'center' });
    return y + 12;
  };

  const addSection = (text, y) => {
    doc.setFontSize(13);
    doc.setTextColor(59, 130, 246);
    doc.text(text, 14, y);
    return y + 8;
  };

  const addLine = (text, y) => {
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, pageWidth - 28);
    doc.text(lines, 14, y);
    return y + lines.length * 6 + 2;
  };

  let y = 20;

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`BIDA Center - ${report.period}`, pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  y = addTitle(report.title, y);

  // Summary
  if (reportData?.summary) {
    y = addSection('TOM TAT', y);
    const s = reportData.summary;
    if (reportData.type === 'attendance') {
      y = addLine(`Tong ban ghi: ${s.totalRecords || 0}`, y);
      y = addLine(`Tong gio lam: ${s.totalHours || 0}h | Gio TB/NV: ${s.avgHoursPerStaff || 0}h`, y);
      y = addLine(`Ty le dung gio: ${s.onTimeRate || 0}% | Ty le muon: ${s.lateRate || 0}%`, y);
    } else if (reportData.type === 'payroll') {
      y = addLine(`Tong nhan vien: ${s.totalRecords || 0}`, y);
      y = addLine(`Tong luong net: ${fmtCurrency(s.totalNet || 0)}`, y);
      y = addLine(`Luong TB: ${fmtCurrency(s.avgNetSalary || 0)}`, y);
      y = addLine(`Tong khau tru: ${fmtCurrency(s.totalDeductions || 0)} | Tang ca: ${s.totalOvertimeHours || 0}h`, y);
    } else if (reportData.type === 'performance') {
      y = addLine(`Diem TB: ${s.avgScore || 0}/100 | Nhan vien: ${s.totalStaff || 0}`, y);
      y = addLine(`Xuat sac: ${s.excellentCount || 0} | Tot: ${s.goodCount || 0} | TB: ${s.averageCount || 0} | Can cai thien: ${s.needsImprovement || 0}`, y);
    } else if (reportData.type === 'coverage') {
      y = addLine(`Tong ca: ${s.totalSlots || 0} | Da phan: ${s.filledSlots || 0} | Trong: ${s.emptySlots || 0}`, y);
      y = addLine(`Coverage: ${s.coveragePercent || 0}%`, y);
    }
  }

  y += 4;
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Details section
  if (reportData?.type === 'attendance' && reportData.byStaff) {
    y = addSection('CHI TIET NHAN VIEN', y);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('STT  Nhan vien              Gio lam   Dung gio   muon   Nghi    Ty le', 14, y);
    y += 5;
    reportData.byStaff.slice(0, 30).forEach((s, i) => {
      const line = `${String(i + 1).padStart(3)}  ${s.name.padEnd(20)}  ${String(s.totalHours + 'h').padStart(8)}  ${String(s.onTimeCount).padStart(8)}  ${String(s.lateCount).padStart(6)}  ${String(s.absentDays).padStart(4)}  ${s.attendanceRate}%`;
      doc.text(line, 14, y);
      y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  doc.save(`${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

const exportExcel = (report, reportData) => {
  const sheets = [];

  if (reportData?.type === 'attendance' && reportData.byStaff) {
    sheets.push({
      name: 'Cham cong',
      headers: ['STT', 'Nhan Vien', 'Vai tro', 'Gio lam', 'Dung gio', 'Muon', 'Nghi', 'Ty le'],
      data: reportData.byStaff.map((s, i) => [i + 1, s.name, s.role || '', s.totalHours, s.onTimeCount, s.lateCount, s.absentDays, `${s.attendanceRate}%`])
    });
    if (reportData.byDept) {
      sheets.push({
        name: 'Theo bo phan',
        headers: ['Bo phan', 'So NV', 'Tong gio', 'So muon'],
        data: reportData.byDept.map(d => [d.dept, d.count, Math.round(d.totalHours), d.lateCount])
      });
    }
  }

  if (reportData?.type === 'payroll' && reportData.payrolls) {
    sheets.push({
      name: 'Luong',
      headers: ['STT', 'Ma NV', 'Ten', 'Bo phan', 'Gio lam', 'Tang ca', 'Phu cap', 'Gross', 'Khau tru', 'Net'],
      data: reportData.payrolls.map((p, i) => [i + 1, p.staffId, p.staffName, p.dept, p.totalHoursWorked, p.overtimeHours, p.allowances, Math.round(p.grossSalary), Math.round(p.deductions), Math.round(p.netSalary)])
    });
  }

  if (reportData?.type === 'performance' && reportData.performance) {
    sheets.push({
      name: 'Hieu suat',
      headers: ['STT', 'Nhan Vien', 'Diem', 'Xep loai', 'Cham cong', 'Task', 'Qua han'],
      data: reportData.performance.map((p, i) => [i + 1, p.name, p.performanceScore, p.rating, `${p.attendanceRate}%`, `${p.taskCompletionRate}%`, p.taskOverdue])
    });
  }

  if (reportData?.type === 'coverage') {
    if (reportData.byDay) {
      sheets.push({
        name: 'Theo ngay',
        headers: ['Ngay', 'Tong', 'Da phan', 'Trong'],
        data: reportData.byDay.map(d => [d.day, d.total, d.filled, d.empty])
      });
    }
    if (reportData.byShift) {
      sheets.push({
        name: 'Theo ca',
        headers: ['Ca', 'Tong', 'Da phan', 'Trong'],
        data: reportData.byShift.map(s => [s.shift, s.total, s.filled, s.empty])
      });
    }
  }

  if (sheets.length === 0) {
    sheets.push({
      name: 'Report',
      headers: ['Data'],
      data: [['No data available']]
    });
  }

  const wb = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const ws = XLSX.utils.aoa_to_sheet([
      [report.title],
      [`Ky: ${report.period}`],
      [],
      ...sheet.headers ? [sheet.headers] : [],
      ...(sheet.data || [])
    ]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
};

// ─── Main Reports Page ────────────────────────────────────────────────────────

export default function Reports() {
  const user = getUser();
  const isAdmin = user.isAdmin;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('create');
  const [reportTypes, setReportTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dept, setDept] = useState('');
  const [report, setReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [deptList, setDeptList] = useState([]);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    Promise.all([
      reportApi.getTypes(),
      reportApi.getDashboard(),
      reportApi.getHistory({ limit: 20 }),
      api.get('/staff')
    ]).then(([typesRes, dashRes, histRes, staffRes]) => {
      if (typesRes.success) setReportTypes(typesRes.data);
      if (dashRes.success) setDashboardData(dashRes.data);
      if (histRes.success) setReportHistory(histRes.data.reports || []);
      if (staffRes.success) {
        const depts = [...new Set(staffRes.data.data?.map(s => s.dept).filter(Boolean))];
        setDeptList(depts);
      }
    }).catch(() => {});
  }, [isAdmin, navigate]);

  const handleGenerate = async () => {
    if (!selectedType) { alert('Vui lòng chọn loại báo cáo'); return; }
    setGenLoading(true);
    try {
      const data = await reportApi.generate({ type: selectedType.key, month, year, dept });
      if (data.success) {
        setReport(data.data.report);
        setReportData(data.data.reportData);
        setActiveTab('view');
        setReportHistory(prev => [data.data.report, ...prev].slice(0, 20));
      }
    } catch (err) { alert(err.message || 'Lỗi khi tạo báo cáo'); }
    finally { setGenLoading(false); }
  };

  const handleExportPDF = () => {
    if (!report || !reportData) return;
    exportPDF(report, reportData);
  };

  const handleExportExcel = () => {
    if (!report || !reportData) return;
    exportExcel(report, reportData);
  };

  if (!isAdmin) return null;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
          📊 Báo cáo & Phân tích
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Tạo báo cáo chuyên sâu, biểu đồ trực quan, xuất PDF & Excel
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'create', label: '📋 Tạo báo cáo' },
          { key: 'view', label: '📊 Xem báo cáo' },
          { key: 'dashboard', label: '📈 Dashboard' },
          { key: 'history', label: '🕘 Lịch sử' }
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: activeTab === t.key ? 'var(--primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Create */}
      {activeTab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Chọn loại báo cáo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {reportTypes.map(t => (
                <div key={t.key}
                  onClick={() => setSelectedType(t)}
                  style={{
                    padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                    background: selectedType?.key === t.key ? `${t.color}15` : 'rgba(255,255,255,0.02)',
                    border: `2px solid ${selectedType?.key === t.key ? t.color : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.2s'
                  }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{t.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{t.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          {selectedType && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
                Cấu hình báo cáo — {selectedType.label}
              </h3>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ minWidth: '140px' }}>
                  <label className="form-label">Tháng</label>
                  <select className="form-input" value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: '120px' }}>
                  <label className="form-label">Năm</label>
                  <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                {deptList.length > 0 && (
                  <div className="form-group" style={{ minWidth: '160px' }}>
                    <label className="form-label">Bộ phận</label>
                    <select className="form-input" value={dept} onChange={e => setDept(e.target.value)}>
                      <option value="">Tất cả</option>
                      {deptList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <button className="btn-primary" onClick={handleGenerate} disabled={genLoading}
                  style={{ padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '6px', height: '42px' }}>
                  {genLoading ? '⏳ Đang tạo...' : `⚡ Tạo báo cáo`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: View */}
      {activeTab === 'view' && (
        <>
          {!reportData ? (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
              <div>Chưa có báo cáo nào được tạo</div>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>Chuyển sang tab <strong style={{ color: 'var(--primary)' }}>Tạo báo cáo</strong> để bắt đầu</div>
            </div>
          ) : (
            <>
              {/* Report Header */}
              <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{report?.title}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tạo bởi {report?.generatedByName} · {new Date(report?.generatedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" onClick={handleExportPDF} style={{ padding: '8px 16px', fontSize: '12px' }}>📄 PDF</button>
                  <button className="btn-primary" onClick={handleExportExcel} style={{ padding: '8px 16px', fontSize: '12px' }}>📊 Excel</button>
                </div>
              </div>

              {/* Report Content */}
              {reportData?.type === 'attendance' && <AttendanceReport data={reportData} onExport={handleExportExcel} loading={loading} />}
              {reportData?.type === 'payroll' && <PayrollReport data={reportData} onExport={handleExportExcel} />}
              {reportData?.type === 'performance' && <PerformanceReport data={reportData} onExport={handleExportExcel} />}
              {reportData?.type === 'coverage' && <CoverageReport data={reportData} onExport={handleExportExcel} />}
              {reportData?.type === 'summary' && <SummaryReport data={reportData} onExport={handleExportExcel} />}
            </>
          )}
        </>
      )}

      {/* TAB: Dashboard */}
      {activeTab === 'dashboard' && (
        <>
          {dashboardData ? (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <StatCard icon="🕐" label="Chấm công tháng" value={dashboardData.kpis?.totalAttendance || 0} color="#3b82f6" small />
                <StatCard icon="⏱️" label="Tổng giờ" value={`${fmt(dashboardData.kpis?.totalHours || 0)}h`} color="#10b981" small />
                <StatCard icon="😊" label="Đúng giờ" value={`${dashboardData.kpis?.onTimeRate || 0}%`} color="#10b981" small />
                <StatCard icon="💰" label="Tổng lương" value={dashboardData.kpis?.totalSalaryFmt || '0đ'} color="#f59e0b" small />
                <StatCard icon="📋" label="Task tháng" value={dashboardData.kpis?.totalTasks || 0} color="#8b5cf6" small />
                <StatCard icon="📅" label="Coverage" value={`${dashboardData.kpis?.coveragePercent || 0}%`} color="#06b6d4" small />
              </div>

              {/* Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <LineChartCard data={dashboardData.charts?.dailyHours || []} title="Giờ làm theo tuần trong tháng" height={220} />
                <BarChartCard data={dashboardData.charts?.topEarners?.map(e => ({ name: e.name, value: e.salary })) || []} title="Top lương cao nhất tháng" height={220} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <PieChartCard data={dashboardData.charts?.attendanceRate} title="Tỷ lệ chấm công tháng" height={240} />
                <PieChartCard data={dashboardData.charts?.taskStatus} title="Tình trạng task tháng" height={240} />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Đang tải dashboard...</div>
          )}
        </>
      )}

      {/* TAB: History */}
      {activeTab === 'history' && (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Lịch sử báo cáo</h4>
          </div>
          {reportHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có báo cáo nào</div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr><th>LOẠI</th><th>TÊN BÁO CÁO</th><th>KỲ</th><th>NGƯỜI TẠO</th><th>NGÀY TẠO</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr>
              </thead>
              <tbody>
                {reportHistory.map(r => (
                  <tr key={r._id}>
                    <td><span style={{ fontSize: '18px' }}>{REPORT_COLORS[r.type] ? '📊' : '📋'}</span></td>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{r.title}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.period}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.generatedByName}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.generatedAt).toLocaleDateString('vi-VN')}</td>
                    <td><span className={`badge ${r.status === 'exported' ? 'badge-success' : r.status === 'generated' ? 'badge-muted' : 'badge-warning'}`}>{r.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={async () => {
                            try {
                              const d = await reportApi.getData(r._id);
                              if (d.success) { setReportData(d.data.reportData); setReport(d.data.meta); setActiveTab('view'); }
                            } catch {}
                          }}>
                          Xem
                        </button>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => reportApi.delete(r._id).then(() => setReportHistory(prev => prev.filter(x => x._id !== r._id)))}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
