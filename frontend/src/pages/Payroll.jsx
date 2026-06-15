import { useState, useEffect, useCallback } from 'react';
import { payrollApi, attendanceApi } from '../services/api';
import { onEvent, Events } from '../utils/events';
import { useMediaQuery } from '../hooks/useMediaQuery';

const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; }
};

const fmt = (n) => n == null ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(n));
const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const STATUS_LABELS = {
  draft: 'Nháp', calculated: 'Đã tính', approved: 'Đã duyệt', paid: 'Đã thanh toán', cancelled: 'Đã hủy'
};
const STATUS_BADGE = {
  draft: 'badge-muted', calculated: 'badge-warning', approved: 'badge-info', paid: 'badge-success', cancelled: 'badge-muted'
};

export default function Payroll() {
  const user = getUser();
  const isAdmin = user.isAdmin;
  const isMobile = useMediaQuery('(max-width: 767px)');
  const now = new Date();

  const [tab, setTab] = useState('payroll');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [wageConfigs, setWageConfigs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ reason: '', amount: '', type: 'bonus' });
  const [showWageModal, setShowWageModal] = useState(false);
  const [wageForm, setWageForm] = useState({
    staffId: '', staffName: '', dept: '',
    baseWage: '', overtimeRate: '1.5', nightShiftRate: '1.3',
    weekendRate: '1.5', holidayRate: '2.0', allowances: '0'
  });
  const [bulkWages, setBulkWages] = useState([]);
  // Staff attendance history state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ totalDaysWorked: 0, totalHoursWorked: 0, lateCount: 0, overtimeHours: 0 });

  const fetchPayrolls = useCallback(async () => {
    try {
      const data = await payrollApi.getPayroll({ month, year });
      if (data.success) setPayrolls(data.data);
    } catch { setPayrolls([]); } finally { setLoading(false); }
  }, [month, year]);

  // Fetch attendance history for staff
  const fetchAttendanceHistory = useCallback(async () => {
    if (isAdmin) return; // Admin uses payroll data, not attendance history
    try {
      const data = await attendanceApi.getMyHistory({ month, year });
      if (data.success && data.data) {
        setAttendanceRecords(data.data.records || []);
        setAttendanceSummary(data.data.summary || { totalDaysWorked: 0, totalHoursWorked: 0, lateCount: 0, overtimeHours: 0 });
      }
    } catch { setAttendanceRecords([]); }
  }, [month, year, isAdmin]);

  const fetchWageConfigs = useCallback(async () => {
    try {
      const data = await payrollApi.getWageConfigs();
      if (data.success) setWageConfigs(data.data);
    } catch { setWageConfigs([]); }
  }, []);

  const fetchStaffList = useCallback(async () => {
    try {
      const data = await payrollApi.getPayroll({ month, year });
      if (!data.success || data.data.length === 0) {
        const staff = await (await import('../services/api')).api.get('/staff');
        if (staff.success) setStaffList(staff.data);
        return;
      }
      const staffIds = [...new Set(data.data.map(p => p.staffId))];
      const staff = await (await import('../services/api')).api.get('/staff');
      if (staff.success) setStaffList(staff.data);
    } catch {
      try {
        const staff = await (await import('../services/api')).api.get('/staff');
        if (staff.success) setStaffList(staff.data);
      } catch { setStaffList([]); }
    }
  }, [month, year]);

  useEffect(() => {
    setLoading(true);
    fetchPayrolls();
    if (isAdmin) {
      fetchWageConfigs();
      fetchStaffList();
    } else {
      // Staff: fetch attendance history instead of payroll
      fetchAttendanceHistory();
    }

    // Poll for updates every 30 seconds (when manager approves attendance)
    const pollInterval = setInterval(() => {
      fetchPayrolls();
      if (!isAdmin) fetchAttendanceHistory();
    }, 30000);

    // Listen for payroll updates from other components (same tab)
    const unsubscribe = onEvent(Events.PAYROLL_UPDATED, () => {
      fetchPayrolls();
      if (!isAdmin) fetchAttendanceHistory();
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [fetchPayrolls, fetchWageConfigs, fetchStaffList, fetchAttendanceHistory, isAdmin]);

  const handleCalculate = async () => {
    if (!confirm(`Tính lương tháng ${month}/${year} cho tất cả nhân viên?`)) return;
    setCalcLoading(true);
    try {
      const data = await payrollApi.calculatePayroll(month, year);
      if (data.success) {
        setPayrolls(data.data);
        alert(`Đã tính lương cho ${data.count} nhân viên.`);
      }
    } catch (err) { alert(err.message || 'Lỗi khi tính lương'); }
    finally { setCalcLoading(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const data = await payrollApi.updatePayrollStatus(id, newStatus);
      if (data.success) {
        setPayrolls(payrolls.map(p => (p._id || p.id) === id ? data.data : p));
        if (selectedPayroll && (selectedPayroll._id || selectedPayroll.id) === id) setSelectedPayroll(data.data);
      }
    } catch (err) { alert(err.message || 'Lỗi'); }
  };

  const handleViewReport = async () => {
    try {
      const data = await payrollApi.getPayrollReport(month, year);
      if (data.success) { setReportData(data.data); setShowReportModal(true); }
    } catch (err) { alert(err.message || 'Lỗi khi tải báo cáo'); }
  };

  const handleAdjustSubmit = async () => {
    if (!adjustForm.reason || !adjustForm.amount) { alert('Điền đầy đủ thông tin.'); return; }
    if (!confirm('Xác nhận điều chỉnh lương?')) return;
    try {
      const data = await payrollApi.adjustPayroll(selectedPayroll._id || selectedPayroll.id, {
        reason: adjustForm.reason,
        amount: Number(adjustForm.amount),
        type: adjustForm.type
      });
      if (data.success) {
        setPayrolls(payrolls.map(p => (p._id || p.id) === (selectedPayroll._id || selectedPayroll.id) ? data.data : p));
        setSelectedPayroll(data.data);
        setShowAdjustModal(false);
        setAdjustForm({ reason: '', amount: '', type: 'bonus' });
      }
    } catch (err) { alert(err.message || 'Lỗi khi điều chỉnh'); }
  };

  const handleRemoveAdjustment = async (adjId) => {
    if (!confirm('Xóa điều chỉnh này?')) return;
    try {
      const data = await payrollApi.removeAdjustment(selectedPayroll._id || selectedPayroll.id, adjId);
      if (data.success) {
        setPayrolls(payrolls.map(p => (p._id || p.id) === (selectedPayroll._id || selectedPayroll.id) ? data.data : p));
        setSelectedPayroll(data.data);
      }
    } catch (err) { alert(err.message || 'Lỗi'); }
  };

  const handleWageSubmit = async () => {
    if (!wageForm.staffId || !wageForm.baseWage) { alert('Chọn nhân viên và lương cơ bản.'); return; }
    try {
      const staff = staffList.find(s => s.id === wageForm.staffId);
      const data = await payrollApi.setWageConfig({
        ...wageForm,
        staffName: staff?.name || wageForm.staffName,
        dept: staff?.dept || wageForm.dept,
        baseWage: Number(wageForm.baseWage),
        overtimeRate: Number(wageForm.overtimeRate) || 1.5,
        nightShiftRate: Number(wageForm.nightShiftRate) || 1.3,
        weekendRate: Number(wageForm.weekendRate) || 1.5,
        holidayRate: Number(wageForm.holidayRate) || 2.0,
        allowances: Number(wageForm.allowances) || 0
      });
      if (data.success) {
        fetchWageConfigs();
        setShowWageModal(false);
        setWageForm({ staffId: '', staffName: '', dept: '', baseWage: '', overtimeRate: '1.5', nightShiftRate: '1.3', weekendRate: '1.5', holidayRate: '2.0', allowances: '0' });
      }
    } catch (err) { alert(err.message || 'Lỗi khi lưu'); }
  };

  const handleBulkWageChange = (staffId, field, value) => {
    setBulkWages(prev => {
      const existing = prev.find(w => w.staffId === staffId) || bulkWages.find(w => w.staffId === staffId);
      const staff = staffList.find(s => s.id === staffId);
      return [...prev.filter(w => w.staffId !== staffId), { staffId, staffName: staff?.name || '', dept: staff?.dept || '', ...existing, [field]: value }];
    });
  };

  const handleSaveBulkWages = async () => {
    const valid = bulkWages.filter(w => w.baseWage);
    if (valid.length === 0) { alert('Nhập ít nhất 1 lương cơ bản.'); return; }
    try {
      await payrollApi.bulkSetWages(valid);
      fetchWageConfigs();
      alert(`Đã lưu ${valid.length} cấu hình lương.`);
    } catch (err) { alert(err.message || 'Lỗi'); }
  };

  const selectPayroll = async (p) => {
    setSelectedPayroll(p);
    try {
      const data = await payrollApi.getPayrollDetail(p._id || p.id);
      if (data.success) setSelectedPayroll(data.data);
    } catch { setSelectedPayroll(p); }
  };

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
  const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalHours = payrolls.reduce((s, p) => s + (p.totalHoursWorked || 0), 0);
  const totalOvertime = payrolls.reduce((s, p) => s + (p.overtimeHours || 0), 0);

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải bảng lương...</div>;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Quản lý Lương
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isAdmin ? 'Tính lương, điều chỉnh và xuất báo cáo' : 'Xem thông tin lương của bạn'}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setTab('wages')}>⚙️ Cấu hình lương</button>
            <button className="btn-primary" onClick={handleCalculate} disabled={calcLoading}>
              {calcLoading ? 'Đang tính...' : '📊 Tính lương tháng'}
            </button>
          </div>
        )}
      </div>

      {/* Tab Nav */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
          {[{ key: 'payroll', label: 'Bảng lương' }, { key: 'wages', label: 'Cấu hình lương' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                background: tab === t.key ? 'var(--primary)' : 'transparent',
                color: tab === t.key ? '#fff' : 'var(--text-secondary)'
              }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Payroll Tab */}
      {tab === 'payroll' && (
        <>
          {/* Filter bar */}
          <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tháng:</span>
            <select className="form-input" value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--bg-darker)', minWidth: '120px' }}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--bg-darker)', minWidth: '100px' }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}
              onClick={() => { setLoading(true); fetchPayrolls(); }}>Lọc</button>
            {isAdmin && (
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px', marginLeft: 'auto' }}
                onClick={handleViewReport}>📋 Báo cáo tháng</button>
            )}
          </div>

          {/* Stats */}
          {isAdmin ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Tổng nhân viên', value: payrolls.length, color: '#fff' },
              { label: 'Tổng lương NET', value: fmt(totalNet) + 'đ', color: 'var(--success)' },
              { label: 'Tổng giờ làm', value: fmt(totalHours) + 'h', color: 'var(--primary)' },
              { label: 'Tổng OT', value: fmt(totalOvertime) + 'h', color: '#fbbf24' },
              { label: 'Lương TB', value: payrolls.length ? fmt(Math.round(totalNet / payrolls.length)) + 'đ' : '0đ', color: '#fff' }
            ].map(s => (
              <div className="glass-card" key={s.label} style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Ngày làm việc', value: attendanceSummary.totalDaysWorked, color: '#fff' },
              { label: 'Tổng giờ làm', value: attendanceSummary.totalHoursWorked + 'h', color: 'var(--primary)' },
              { label: 'Số lần trễ', value: attendanceSummary.lateCount, color: '#eab308' },
              { label: 'Giờ tăng ca', value: attendanceSummary.overtimeHours + 'h', color: '#22c55e' }
            ].map(s => (
              <div className="glass-card" key={s.label} style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          )}

          {/* Main Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: isAdmin && selectedPayroll && !isMobile ? '1.5fr 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Admin: Payroll Table */}
            {isAdmin ? (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>NHÂN VIÊN</th>
                      <th>BỘ PHẬN</th>
                      <th>GIỜ</th>
                      <th>OT</th>
                      <th>PHỤ CẤP</th>
                      <th>LƯƠNG GROSS</th>
                      <th>ĐIỀU CHỈNH</th>
                      <th>LƯƠNG NET</th>
                      <th>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Chưa có bảng lương tháng này. Nhấn "Tính lương" để tạo.
                      </td></tr>
                    ) : payrolls.map(p => {
                      const pid = p._id || p.id;
                      return (
                        <tr key={pid} style={{ cursor: 'pointer', background: selectedPayroll && (selectedPayroll._id || selectedPayroll.id) === pid ? 'rgba(225,29,72,0.05)' : 'transparent' }}
                          onClick={() => selectPayroll(p)}>
                          <td style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{p.staffName}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.dept}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.totalHoursWorked?.toFixed(1) || 0}h</td>
                          <td style={{ fontSize: '12px', color: '#fbbf24' }}>{p.overtimeHours?.toFixed(1) || 0}h</td>
                          <td style={{ fontSize: '12px', color: 'var(--success)' }}>+{fmt(p.allowances)}đ</td>
                          <td style={{ fontSize: '13px', color: '#fff' }}>{fmt(p.grossSalary)}đ</td>
                          <td style={{ fontSize: '12px', color: p.adjustmentTotal > 0 ? 'var(--success)' : p.adjustmentTotal < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {p.adjustmentTotal !== 0 ? (p.adjustmentTotal > 0 ? '+' : '') + fmt(p.adjustmentTotal) + 'đ' : '—'}
                          </td>
                          <td style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{fmt(p.netSalary)}đ</td>
                          <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-muted'}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Staff: Salary Summary Card */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      💰
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tổng thu nhập tháng {month}/{year}</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--success)' }}>
                        {new Intl.NumberFormat('vi-VN').format(Math.round(attendanceSummary.totalHoursWorked * 30000))}đ
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{attendanceSummary.totalDaysWorked}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Ngày làm</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{attendanceSummary.totalHoursWorked?.toFixed(2).replace(/\.00$/, '') || 0}h</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Giờ làm</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#eab308' }}>{attendanceSummary.lateCount}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Lần trễ</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>{attendanceSummary.overtimeHours}h</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Tăng ca</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '600' }}>30,000đ/h</span> × {attendanceSummary.totalHoursWorked?.toFixed(2).replace(/\.00$/, '') || 0}h = <span style={{ color: 'var(--success)', fontWeight: '600' }}>{new Intl.NumberFormat('vi-VN').format(Math.round((attendanceSummary.totalHoursWorked || 0) * 30000))}đ</span>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>NGÀY</th>
                        <th>CHECK-IN</th>
                        <th>CHECK-OUT</th>
                        <th>GIỜ</th>
                        <th>CA</th>
                        <th>TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Chưa có lịch sử chấm công tháng này
                        </td></tr>
                      ) : attendanceRecords.map(r => (
                        <tr key={r._id}>
                          <td style={{ fontWeight: '500' }}>{new Date(r.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                          <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td>{r.hours != null ? r.hours.toFixed(2).replace(/\.00$/, '') + 'h' : '-'}</td>
                          <td>{r.shift || '—'}</td>
                          <td>
                            <span className={`badge ${r.status === 'late' ? 'badge-warning' : r.status === 'on_time' ? 'badge-success' : 'badge-muted'}`}>
                              {r.status === 'late' ? 'Trễ' : r.status === 'on_time' ? 'Đúng giờ' : r.status || 'Bình thường'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Admin: Detail Panel */}
            {isAdmin && selectedPayroll && (
              <div className="glass-card animate-fade-in" style={{ padding: '20px', position: 'sticky', top: '84px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Chi tiết lương</h4>
                  <button onClick={() => setSelectedPayroll(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>

                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{selectedPayroll.staffName}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedPayroll.dept} · {selectedPayroll.month}/{selectedPayroll.year}</div>
                <span className={`badge ${STATUS_BADGE[selectedPayroll.status]}`} style={{ marginBottom: '16px' }}>{STATUS_LABELS[selectedPayroll.status]}</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '16px' }}>
                  {[
                    ['Lương cơ bản', fmt(selectedPayroll.baseWage) + 'đ'],
                    ['Số giờ làm', (selectedPayroll.totalHoursWorked || 0).toFixed(1) + 'h'],
                    ['Giờ OT', (selectedPayroll.overtimeHours || 0).toFixed(1) + 'h · +' + fmt(selectedPayroll.overtimePay) + 'đ'],
                    ['Giờ đêm', (selectedPayroll.nightShiftHours || 0).toFixed(1) + 'h · +' + fmt(selectedPayroll.nightShiftPay) + 'đ'],
                    ['Giờ cuối tuần', (selectedPayroll.weekendHours || 0).toFixed(1) + 'h · +' + fmt(selectedPayroll.weekendPay) + 'đ'],
                    ['Ngày làm', selectedPayroll.totalDaysWorked || 0],
                    ['Số lần đi muộn', selectedPayroll.lateCount || 0],
                    ['Phụ cấp', '+' + fmt(selectedPayroll.allowances) + 'đ'],
                    ['Lương GROSS', fmt(selectedPayroll.grossSalary) + 'đ'],
                    ['Điều chỉnh', (selectedPayroll.adjustmentTotal || 0) !== 0 ? ((selectedPayroll.adjustmentTotal > 0 ? '+' : '') + fmt(selectedPayroll.adjustmentTotal) + 'đ') : '—'],
                  ].map(([label, value], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-glass)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: label.includes('GROSS') ? '700' : '500', color: label.includes('GROSS') ? '#fff' : '#fff' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* NET Salary highlight */}
                <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lương NET</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{fmt(selectedPayroll.netSalary)}đ</div>
                </div>

                {/* Adjustments */}
                {selectedPayroll.adjustments?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Lịch sử điều chỉnh:</div>
                    {selectedPayroll.adjustments.map((adj, i) => (
                      <div key={adj._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '4px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: adj.type === 'deduction' ? 'var(--danger)' : 'var(--success)' }}>
                            {adj.type === 'deduction' ? '-' : '+'}{fmt(adj.amount)}đ
                          </span>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{adj.reason}</div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleRemoveAdjustment(adj._id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Attendance details toggle */}
                {selectedPayroll.attendanceDetails?.length > 0 && (
                  <details style={{ marginBottom: '16px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', padding: '8px 0' }}>
                      📅 Chi tiết chấm công ({selectedPayroll.attendanceDetails.length} ngày)
                    </summary>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px' }}>
                      {selectedPayroll.attendanceDetails.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{a.date}</span>
                          <span style={{ color: '#fff' }}>{a.checkIn}–{a.checkOut}</span>
                          <span style={{ color: a.status === 'late' ? 'var(--danger)' : a.status === 'absent' ? 'var(--danger)' : 'var(--success)' }}>{a.hours.toFixed(1)}h</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedPayroll.status !== 'paid' && (
                      <button className="btn-primary" style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                        onClick={() => setShowAdjustModal(true)}>± Điều chỉnh lương</button>
                    )}
                    {selectedPayroll.status === 'calculated' && (
                      <button className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                        onClick={() => handleStatusChange(selectedPayroll._id || selectedPayroll.id, 'approved')}>✅ Duyệt lương</button>
                    )}
                    {selectedPayroll.status === 'approved' && (
                      <button className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '13px', background: 'rgba(16,185,129,0.1)', borderColor: 'var(--success)' }}
                        onClick={() => handleStatusChange(selectedPayroll._id || selectedPayroll.id, 'paid')}>💰 Thanh toán</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Wage Config Tab */}
      {tab === 'wages' && isAdmin && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Đang có {wageConfigs.length} cấu hình lương</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => { setBulkWages(staffList.filter(s => s.status === 'Đang làm').map(s => ({ staffId: s.id, staffName: s.name, dept: s.dept, baseWage: '' }))); }}>
                📋 Nhập hàng loạt
              </button>
              <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => { setWageForm({ staffId: '', staffName: '', dept: '', baseWage: '', overtimeRate: '1.5', nightShiftRate: '1.3', weekendRate: '1.5', holidayRate: '2.0', allowances: '0' }); setShowWageModal(true); }}>
                ➕ Thêm mới
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>NHÂN VIÊN</th>
                    <th>BỘ PHẬN</th>
                    <th>LƯƠNG CB</th>
                    <th>HỆ SỐ OT</th>
                    <th>HỆ SỐ ĐÊM</th>
                    <th>HỆ SỐ CUỐI TUẦN</th>
                    <th>HỆ SỐ NGÀY LỄ</th>
                    <th>PHỤ CẤP</th>
                    <th>HIỆU LỰC</th>
                  </tr>
                </thead>
                <tbody>
                  {wageConfigs.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Chưa có cấu hình lương nào. Nhấn "Thêm mới" để bắt đầu.
                    </td></tr>
                  ) : wageConfigs.map(w => (
                    <tr key={w._id}>
                      <td style={{ fontWeight: '600', color: '#fff' }}>{w.staffName}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{w.dept}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>{fmt(w.baseWage)}đ</td>
                      <td style={{ color: '#fbbf24', fontSize: '13px' }}>{w.overtimeRate}x</td>
                      <td style={{ color: '#60a5fa', fontSize: '13px' }}>{w.nightShiftRate}x</td>
                      <td style={{ color: '#a78bfa', fontSize: '13px' }}>{w.weekendRate}x</td>
                      <td style={{ color: '#f87171', fontSize: '13px' }}>{w.holidayRate}x</td>
                      <td style={{ color: 'var(--success)' }}>+{fmt(w.allowances)}đ</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmtDate(w.effectiveFrom)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedPayroll && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', width: '100%', maxWidth: isMobile ? '100%' : '440px', background: '#0d111a', borderRadius: isMobile ? '0' : '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Điều chỉnh lương</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Loại điều chỉnh</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={adjustForm.type} onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value })}>
                  <option value="bonus">Thưởng (+)</option>
                  <option value="deduction">Khấu trừ (-)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Số tiền (VNĐ)</label>
                <input type="number" className="form-input" placeholder="VD: 500000"
                  value={adjustForm.amount} onChange={e => setAdjustForm({ ...adjustForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Lý do</label>
                <input type="text" className="form-input" placeholder="VD: Thưởng tháng, Phạt đi muộn..."
                  value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAdjustModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleAdjustSubmit}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Wage Config Modal */}
      {showWageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', width: '100%', maxWidth: isMobile ? '100%' : '480px', background: '#0d111a', maxHeight: isMobile ? '100vh' : '90vh', height: isMobile ? '100vh' : 'auto', overflowY: 'auto', borderRadius: isMobile ? '0' : '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Cấu hình lương</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nhân viên</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={wageForm.staffId}
                  onChange={e => { const s = staffList.find(st => st.id === e.target.value); setWageForm({ ...wageForm, staffId: e.target.value, staffName: s?.name || '', dept: s?.dept || '' }); }}>
                  <option value="">Chọn nhân viên...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name} - {s.dept}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lương cơ bản (VNĐ) *</label>
                <input type="number" className="form-input" placeholder="VD: 5000000"
                  value={wageForm.baseWage} onChange={e => setWageForm({ ...wageForm, baseWage: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Hệ số OT', field: 'overtimeRate', desc: 'Mặc định: 1.5' },
                  { label: 'Hệ số ca đêm', field: 'nightShiftRate', desc: 'Mặc định: 1.3' },
                  { label: 'Hệ số cuối tuần', field: 'weekendRate', desc: 'Mặc định: 1.5' },
                  { label: 'Hệ số ngày lễ', field: 'holidayRate', desc: 'Mặc định: 2.0' },
                ].map(f => (
                  <div key={f.field} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input type="number" step="0.1" className="form-input"
                      value={wageForm[f.field]} onChange={e => setWageForm({ ...wageForm, [f.field]: e.target.value })} />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Phụ cấp cố định (VNĐ)</label>
                <input type="number" className="form-input" placeholder="VD: 500000"
                  value={wageForm.allowances} onChange={e => setWageForm({ ...wageForm, allowances: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowWageModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleWageSubmit}>Lưu cấu hình</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', width: '100%', maxWidth: isMobile ? '100%' : '760px', background: '#0d111a', maxHeight: isMobile ? '100vh' : '90vh', height: isMobile ? '100vh' : 'auto', overflowY: 'auto', borderRadius: isMobile ? '0' : '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Báo cáo lương {reportData.payrolls?.[0]?.month}/{reportData.payrolls?.[0]?.year}</h3>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Tổng nhân viên', value: reportData.summary.totalEmployees },
                { label: 'Tổng lương NET', value: fmt(reportData.summary.totalNet) + 'đ', color: 'var(--success)' },
                { label: 'Lương TB', value: fmt(reportData.summary.avgSalary) + 'đ' },
                { label: 'Tổng giờ OT', value: fmt(reportData.summary.totalOvertime) + 'đ' },
                { label: 'Tổng phụ cấp', value: fmt(reportData.summary.totalAllowances) + 'đ' },
                { label: 'Tổng điều chỉnh', value: fmt(reportData.summary.totalAdjustments) + 'đ' },
              ].map(s => (
                <div key={s.label} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: s.color || '#fff' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {Object.keys(reportData.byDept || {}).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Theo bộ phận:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(reportData.byDept).map(([dept, d]) => (
                    <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '13px' }}>
                      <span style={{ color: '#fff', fontWeight: '600' }}>{dept}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{d.count} NV</span>
                      <span style={{ color: 'var(--success)' }}>{fmt(d.net)}đ</span>
                      <span style={{ color: 'var(--text-muted)' }}>{d.hours.toFixed(0)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowReportModal(false)}>Đóng</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }}
                onClick={() => { alert('Tính năng xuất Excel đang phát triển.'); }}>📥 Xuất Excel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
