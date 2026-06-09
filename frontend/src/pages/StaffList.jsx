import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces';

export default function StaffList() {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '', email: '', phone: '', address: '', dept: 'Phục vụ'
  });

  const fetchStaff = async () => {
    try {
      const data = await api.get('/staff');
      if (data.success) {
        setStaffData(data.data.map(s => ({
          ...s,
          avatar: s.avatar || DEFAULT_AVATAR,
          history: s.history || []
        })));
      }
    } catch {
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.phone || !newStaff.address) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    try {
      const data = await api.post('/staff', newStaff);
      if (data.success) {
        setStaffData([...staffData, { ...data.data, avatar: data.data.avatar || DEFAULT_AVATAR, history: [] }]);
        setShowAddModal(false);
        setNewStaff({ name: '', email: '', phone: '', address: '', dept: 'Phục vụ' });
      }
    } catch (err) {
      alert(err.message || 'Không thể thêm nhân viên');
    }
  };

  const activeCount = staffData.filter(s => s.status === 'Đang làm').length;
  const deptCounts = staffData.reduce((acc, s) => {
    acc[s.dept] = (acc[s.dept] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải danh sách nhân viên...</div>;
  }

  // Filter staff data
  const filteredStaff = staffData.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || staff.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || staff.dept === deptFilter;
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Active' && staff.status === 'Đang làm') ||
                          (statusFilter === 'Leave' && staff.status === 'Nghỉ');
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left', position: 'relative' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Quản lý Nhân sự
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Theo dõi, đánh giá hiệu suất và điều phối đội ngũ làm việc.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Thêm Nhân Viên
        </button>
      </div>

      {/* Main Grid: Filters + Table on Left, Stats on Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedStaff ? '2.5fr 1.3fr' : '3.2fr 1fr',
        gap: '24px',
        alignItems: 'start',
        transition: 'grid-template-columns var(--transition-normal)'
      }}>
        
        {/* Left Side: Table & Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Filters Bar */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm nhân viên (Tên, ID)..." 
              className="form-input" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flexGrow: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px' }}
            />
            
            <select 
              className="form-input" 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ width: '150px', background: 'var(--bg-darker)', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="All">Tất cả bộ phận</option>
              <option value="Quản lý">Quản lý</option>
              <option value="Thu ngân">Thu ngân</option>
              <option value="Phục vụ">Phục vụ</option>
            </select>

            <select 
              className="form-input" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '140px', background: 'var(--bg-darker)', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="All">Trạng thái</option>
              <option value="Active">Đang làm việc</option>
              <option value="Leave">Nghỉ phép</option>
            </select>
          </div>

          {/* Table Card */}
          <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>NHÂN VIÊN</th>
                    <th>BỘ PHẬN</th>
                    <th>TRẠNG THÁI</th>
                    <th>NGÀY GIA NHẬP</th>
                    <th>HIỆU SUẤT</th>
                    <th>HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr 
                      key={staff.id} 
                      onClick={() => setSelectedStaff(staff)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={staff.avatar} 
                            alt="Avatar" 
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: '600', color: '#fff' }}>{staff.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{staff.dept}</td>
                      <td>
                        <span className={`badge ${staff.status === 'Đang làm' ? 'badge-success' : 'badge-danger'}`}>
                          {staff.status === 'Đang làm' ? 'Đang làm' : 'Nghỉ'}
                        </span>
                      </td>
                      <td>{staff.joinDate}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${parseFloat(staff.rating) * 20}%`, 
                              height: '100%', 
                              background: parseFloat(staff.rating) >= 4.5 ? 'var(--success)' : 'var(--warning)' 
                            }}></div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>{staff.rating} ⭐</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>⋮</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Hiển thị 1 - {filteredStaff.length} trong tổng số {staffData.length} nhân viên
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} disabled>&lt;</button>
                <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>1</button>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} disabled>&gt;</button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Roster Snapshot & Support Details (If drawer is closed) */}
        {!selectedStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Allocation Chart/Capacity */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
                📊 Phân bổ nhân sự
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '80px', padding: '0 10px', marginBottom: '16px' }}>
                {[
                  { day: 'M', h: 40, active: false },
                  { day: 'T', h: 55, active: false },
                  { day: 'W', h: 30, active: false },
                  { day: 'T', h: 60, active: false },
                  { day: 'F', h: 80, active: true },
                  { day: 'S', h: 70, active: false },
                  { day: 'S', h: 50, active: false }
                ].map((d, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '12px',
                      height: `${d.h}px`,
                      background: d.active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '4px'
                    }}></div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tải công suất ca: <strong style={{ color: 'var(--primary)' }}>82% (Peak)</strong>
              </div>
            </div>

            {/* On-Duty Snapshot */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
                👥 On-Duty Snapshot
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Đang làm:</span>
                  <strong>{activeCount} / {staffData.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Phục vụ:</span>
                  <strong>{deptCounts['Phục vụ'] || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Thu ngân:</span>
                  <strong>{deptCounts['Thu ngân'] || 0}</strong>
                </div>
              </div>
            </div>

            {/* Support Box */}
            <div className="glass-card" style={{ background: 'rgba(225, 29, 72, 0.03)', border: '1px solid rgba(225, 29, 72, 0.15)', padding: '20px', textAlign: 'center' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Need Support?</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Generate automated rosters or export staff performance.
              </p>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', width: '100%' }}>
                GO TO REPORTS
              </button>
            </div>

          </div>
        )}

        {/* Slide-over Right Drawer (If staff selected) */}
        {selectedStaff && (
          <div className="glass-card animate-fade-in" style={{
            padding: '24px',
            position: 'sticky',
            top: '84px',
            borderLeft: '2px solid var(--primary)',
            background: '#0d111a'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>Chi tiết nhân viên</h4>
              <button 
                onClick={() => setSelectedStaff(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Profile image & Main info */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <img 
                src={selectedStaff.avatar} 
                alt={selectedStaff.name} 
                style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid var(--primary)', marginBottom: '12px' }}
              />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff' }}>{selectedStaff.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedStaff.dept} chuyên nghiệp</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <span className={`badge ${selectedStaff.status === 'Đang làm' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedStaff.status}
                </span>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }} onClick={() => alert('Đổi trạng thái làm việc.')}>
                  Đổi trạng thái
                </button>
              </div>
            </div>

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              
              {/* Contact Info */}
              <div>
                <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Thông tin liên hệ
                </h5>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>✉️ <span style={{ color: 'var(--text-secondary)' }}>{selectedStaff.email}</span></div>
                  <div>📞 <span style={{ color: 'var(--text-secondary)' }}>{selectedStaff.phone}</span></div>
                  <div>📍 <span style={{ color: 'var(--text-secondary)' }}>{selectedStaff.address}</span></div>
                </div>
              </div>

              {/* Performance Indicator */}
              <div>
                <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Chỉ số hiệu suất
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tổng giờ làm</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginTop: '2px' }}>{selectedStaff.hours}</div>
                    <div style={{ fontSize: '9px', color: 'var(--success)', marginTop: '2px' }}>+12% tháng trước</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Đánh giá khách</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>{selectedStaff.rating} / 5</div>
                    <div style={{ color: '#fbbf24', fontSize: '9px', marginTop: '2px' }}>⭐⭐⭐⭐⭐</div>
                  </div>
                </div>
              </div>

              {/* History shift */}
              <div>
                <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Lịch sử ca gần đây
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedStaff.history || []).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa có lịch sử ca</div>
                  ) : (selectedStaff.history || []).map((hist, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{hist.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{hist.date}</div>
                      </div>
                      <span style={{ color: 'var(--success)', fontWeight: '500' }}>{hist.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-secondary" style={{ flexGrow: 1, padding: '10px', fontSize: '13px' }} onClick={() => alert('Chỉnh sửa thông tin nhân viên.')}>
                  Sửa thông tin
                </button>
                <button className="btn-primary" style={{ flexGrow: 1, padding: '10px', fontSize: '13px' }} onClick={() => alert('Giao việc cho nhân viên.')}>
                  Giao việc
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '500px', background: '#0d111a' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
              Thêm Nhân Viên Mới
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" className="form-input" placeholder="Họ tên" value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
              <input type="email" className="form-input" placeholder="Email" value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
              <input type="text" className="form-input" placeholder="Số điện thoại" value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} />
              <input type="text" className="form-input" placeholder="Địa chỉ" value={newStaff.address}
                onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })} />
              <select className="form-input" style={{ background: 'var(--bg-darker)' }} value={newStaff.dept}
                onChange={(e) => setNewStaff({ ...newStaff, dept: e.target.value })}>
                <option value="Quản lý">Quản lý</option>
                <option value="Thu ngân">Thu ngân</option>
                <option value="Phục vụ">Phục vụ</option>
                <option value="Bảo vệ">Bảo vệ</option>
                <option value="Vệ sinh">Vệ sinh</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleAddStaff}>Thêm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
