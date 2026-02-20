'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, UserPlus, Filter, MoreVertical, Edit2, Shield, AlertCircle, X, Save } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, admin, distributor
  const [selectedUser, setSelectedUser] = useState(null); // For edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleEditClick = (user) => {
    setSelectedUser({ ...user }); // Clone to edit
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        role: selectedUser.role,
        is_active: selectedUser.is_active,
        full_name: selectedUser.full_name,
        city: selectedUser.city,
        phone: selectedUser.phone,
      })
      .eq('id', selectedUser.id);

    if (error) {
      alert('Error updating user: ' + error.message);
    } else {
      // Update local state
      setUsers(users.map(u => (u.id === selectedUser.id ? selectedUser : u)));
      setIsModalOpen(false);
    }
    setUpdating(false);
  };

  const filteredUsers = users.filter(user => {
    const safeSearch = searchTerm?.toLowerCase() || '';
    const matchesSearch =
      (user.email && user.email.toLowerCase().includes(safeSearch)) ||
      (user.full_name && user.full_name.toLowerCase().includes(safeSearch));

    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  if (loading) return <div className="loading">Cargando Usuarios...</div>;

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Gestión de Usuarios</h1>
          <p>Administra las cuentas de distribuidores y administradores.</p>
        </div>
        {/* Placeholder for "Invite User" feature if needed later */}
        {/* <button className="btn btn-primary"><UserPlus size={18} /> Invitar Usuario</button> */}
      </div>

      <div className="filters-bar glass-panel">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <Filter size={18} className="filter-icon" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los Roles</option>
            <option value="distributor">Distribuidores</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </div>

      <div className="table-container glass-panel">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Ciudad</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-name">{user.full_name || 'Sin nombre'}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="detail-cell">{user.city || '—'}</td>
                  <td className="detail-cell">{user.phone || '—'}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? <Shield size={12} /> : null}
                      {user.role === 'admin' ? 'Administrador' : 'Distribuidor'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="date-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => handleEditClick(user)}
                      title="Editar Usuario"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">
                  <AlertCircle size={32} />
                  <p>No se encontraron usuarios.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {isModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Editar Usuario</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico</label>
                <input
                  type="text"
                  value={selectedUser.email}
                  disabled
                  className="input-glass disabled"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={selectedUser.city || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, city: e.target.value })}
                    className="input-glass"
                    placeholder="Ej. Monterrey, NL"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="input-glass"
                    placeholder="81 1234 5678"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="input-glass select"
                  >
                    <option value="distributor">Distribuidor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={selectedUser.is_active ? 'true' : 'false'}
                    onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.value === 'true' })}
                    className="input-glass select"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-glass"
                onClick={() => setIsModalOpen(false)}
                disabled={updating}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveUser}
                disabled={updating}
              >
                {updating ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .users-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-title h1 {
          font-size: 2rem;
          color: white;
          margin: 0;
        }
        .header-title p {
          color: var(--color-text-muted);
          margin-top: 0.5rem;
        }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          margin-bottom: 1.5rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 250px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }

        .search-input {
          width: 100%;
          padding: 0.6rem 0.6rem 0.6rem 2.5rem;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          color: white;
          outline: none;
        }
        .search-input:focus {
          border-color: var(--color-primary);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-icon {
          color: var(--color-text-muted);
        }
        .filter-select {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.6rem;
          border-radius: var(--radius-sm);
          outline: none;
        }

        .table-container {
          overflow-x: auto;
          padding: 0;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          color: white;
        }

        .users-table th {
          text-align: left;
          padding: 1rem;
          color: var(--color-text-muted);
          font-weight: 600;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .users-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          vertical-align: middle;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: var(--color-primary);
          color: black;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .user-name {
          font-weight: 500;
          color: white;
        }
        .user-email {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.6rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .role-badge.admin {
          background: rgba(147, 51, 234, 0.2);
          color: #c084fc;
        }
        .role-badge.distributor {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.active {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }
        .status-badge.inactive {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .date-cell {
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .btn-icon {
          background: rgba(255,255,255,0.05);
          border: none;
          color: var(--color-text-muted);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: var(--color-primary);
          color: black;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--color-text-muted);
        }
        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 0; /* Let header/body/footer handle padding */
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          margin: 0;
          color: white;
          font-size: 1.25rem;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .close-btn:hover { color: white; }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .input-glass {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-family: inherit;
        }
        .input-glass:focus {
          border-color: var(--color-primary);
          outline: none;
        }
        .input-glass.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
