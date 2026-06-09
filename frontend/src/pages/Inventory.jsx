import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: '', category: 'Đồ uống', quantity: 0, unit: 'chai', minStock: 10
  });

  const fetchInventory = async () => {
    try {
      const data = await api.get('/inventory');
      if (data.success) setInventory(data.data);
    } catch {
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'low':
        return <span className="badge badge-danger">Sắp hết</span>;
      case 'out':
        return <span className="badge badge-danger">Hết hàng</span>;
      case 'ok':
        return <span className="badge badge-success">Đủ</span>;
      default:
        return <span className="badge badge-warning">Khác</span>;
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name) {
      alert('Vui lòng nhập tên mặt hàng');
      return;
    }
    try {
      const data = await api.post('/inventory', newItem);
      if (data.success) {
        setInventory([data.data, ...inventory]);
        setShowAddModal(false);
        setNewItem({ name: '', category: 'Đồ uống', quantity: 0, unit: 'chai', minStock: 10 });
      }
    } catch (err) {
      alert(err.message || 'Không thể thêm mặt hàng');
    }
  };

  const handleStockChange = async (item, action) => {
    const qty = prompt(action === 'add' ? 'Nhập số lượng thêm:' : 'Nhập số lượng xuất:', '1');
    if (!qty || isNaN(qty) || Number(qty) <= 0) return;
    try {
      const data = await api.post(`/inventory/${item.id}/${action}`, { quantity: Number(qty) });
      if (data.success) {
        setInventory(inventory.map(i => i.id === item.id ? data.data : i));
      }
    } catch (err) {
      alert(err.message || 'Không thể cập nhật tồn kho');
    }
  };

  const lowStockItems = inventory.filter(item => item.status === 'low' || item.status === 'out').length;
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải kho hàng...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Quản lý Kho
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Theo dõi và quản lý tồn kho đồ uống, dụng cụ và vật tư.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Thêm Mặt Hàng
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>{inventory.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tổng mặt hàng</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>{totalItems}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tổng số lượng</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--danger)' }}>{lowStockItems}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Sắp hết hàng</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)' }}>{inventory.length - lowStockItems}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Đủ hàng</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Tìm kiếm mặt hàng..."
          className="form-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flexGrow: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px' }}
        />
        <select
          className="form-input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: '150px', background: 'var(--bg-darker)', padding: '8px 12px', fontSize: '13px' }}
        >
          <option value="All">Tất cả danh mục</option>
          <option value="Đồ uống">Đồ uống</option>
          <option value="Dụng cụ">Dụng cụ</option>
          <option value="Vệ sinh">Vệ sinh</option>
        </select>
      </div>

      {lowStockItems > 0 && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)', marginBottom: '12px' }}>
            ⚠️ Cảnh báo: {lowStockItems} mặt hàng sắp hết tồn kho
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inventory.filter(item => item.status === 'low' || item.status === 'out').map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <span style={{ color: '#fff' }}>{item.name}</span>
                <span style={{ color: 'var(--danger)' }}>Còn {item.quantity} {item.unit} (Tối thiểu: {item.minStock})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>MÃ</th>
                <th>TÊN MẶT HÀNG</th>
                <th>DANH MỤC</th>
                <th>SỐ LƯỢNG</th>
                <th>ĐƠN VỊ</th>
                <th>TỒN KHO TỐI THIỂU</th>
                <th>TRẠNG THÁI</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Chưa có mặt hàng nào trong kho
                  </td>
                </tr>
              ) : filteredInventory.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.id}</td>
                  <td><div style={{ fontWeight: '600', color: '#fff' }}>{item.name}</div></td>
                  <td>{item.category}</td>
                  <td>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: item.status === 'low' || item.status === 'out' ? 'var(--danger)' : '#fff' }}>
                      {item.quantity}
                    </div>
                  </td>
                  <td>{item.unit}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.minStock}</td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleStockChange(item, 'add')}>➕</button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleStockChange(item, 'remove')}>➖</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '500px', background: '#0d111a' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
              Thêm Mặt Hàng Mới
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" className="form-input" placeholder="Tên mặt hàng" value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              <select className="form-input" style={{ background: 'var(--bg-darker)' }} value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                <option value="Đồ uống">Đồ uống</option>
                <option value="Dụng cụ">Dụng cụ</option>
                <option value="Vệ sinh">Vệ sinh</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input type="number" className="form-input" placeholder="Số lượng" value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
                <input type="text" className="form-input" placeholder="Đơn vị" value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
              </div>
              <input type="number" className="form-input" placeholder="Tồn kho tối thiểu" value={newItem.minStock}
                onChange={(e) => setNewItem({ ...newItem, minStock: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleAddItem}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
