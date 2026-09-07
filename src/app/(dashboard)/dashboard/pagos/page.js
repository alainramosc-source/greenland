'use client';
import { useState } from 'react';
import { usePayments } from '@/hooks/usePayments';
import PaymentsSummaryHeader from './components/PaymentsSummaryHeader';
import ReceiptLightbox from './components/ReceiptLightbox';
import PaymentCard from './components/PaymentCard';
import CashMovementsTab from './components/CashMovementsTab';
import ReconciliationTab from './components/ReconciliationTab';
import { Clock, Wallet, FileSpreadsheet, Search, Filter, CreditCard } from 'lucide-react';

export default function AdminPagosPage() {
  const {
    payments = [], loading, actionLoading,
    filterStatus, setFilterStatus,
    filterDistributor, setFilterDistributor,
    lightboxImg, setLightboxImg,
    rejectModal, setRejectModal,
    rejectReason, setRejectReason,
    balances = [], showBalances, setShowBalances,
    activeTab, setActiveTab,
    userSubRole, currentUserId, cashReceivedBy, setCashReceivedBy, parsedMovements = [], matchResults = [],
    cashMovements = [],
    cajaDateFrom, setCajaDateFrom,
    cajaDateTo, setCajaDateTo,
    cajaSubTab, setCajaSubTab,
    dailySearchTerm, setDailySearchTerm,
    showEntryModal, setShowEntryModal, entryForm, setEntryForm, entrySubmitting, handleRegisterEntry,
    showExitModal, setShowExitModal, exitForm, setExitForm, exitSubmitting, handleRegisterExit,
    editModal, setEditModal, editForm, setEditForm, editSubmitting, handleEditMovement, handleDeleteMovement,
    showAuditModal, setShowAuditModal, auditForm, setAuditForm, auditSubmitting, handlePerformAudit,
    cashAudits = [],
    handleSignExit,
    exportPaymentsXLSX,
    fetchData, handleApprovePayment, handleRejectPayment, handleApplyAudit, orderMap = {},
    parseBankCSV, parsePDFStatement, handleViewReceipt
  } = usePayments();

  const [searchTerm, setSearchTerm] = useState('');

  const safePayments = Array.isArray(payments) ? payments : [];
  const safeBalances = Array.isArray(balances) ? balances : [];

  const pendingCount = safePayments.filter(p => p?.status === 'pending').length;
  const approvedMonth = safePayments
    .filter(p => p?.status === 'approved' && new Date(p?.created_at).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + (Number(p?.amount) || 0), 0);
  const totalBalance = safeBalances.reduce((s, b) => s + (Number(b?.balance) || 0), 0);

  const filteredPayments = safePayments.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterDistributor !== 'all' && p.distributor_id !== filterDistributor) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const distName = (p.profiles?.full_name || p.distributor?.company_name || p.distributor_name || '').toLowerCase();
      const ref = (p.reference_number || '').toLowerCase();
      if (!distName.includes(term) && !ref.includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header & Stats & Saldos Table */}
      <PaymentsSummaryHeader
        pendingCount={pendingCount}
        approvedMonth={approvedMonth}
        totalBalance={totalBalance}
        balances={safeBalances}
        showBalances={showBalances}
        setShowBalances={setShowBalances}
        loading={loading}
        onRefresh={fetchData}
      />

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('pagos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'pagos'
              ? 'bg-[#6a9a04] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pagos de Distribuidores ({safePayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('caja')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'caja'
              ? 'bg-[#6a9a04] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Movimientos de Caja</span>
        </button>

        <button
          onClick={() => setActiveTab('conciliacion')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'conciliacion'
              ? 'bg-[#6a9a04] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Conciliación Bancaria</span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'pagos' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por distribuidor o ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Filter className="w-4 h-4" />
                <span>Estado:</span>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
              >
                <option value="all">Todos ({safePayments.length})</option>
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
          </div>

          {/* Payment Card List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm font-medium">Cargando pagos...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-12 text-center text-slate-400 text-sm">
              No hay comprobantes de pago para mostrar.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onApprove={handleApprovePayment}
                  onOpenRejectModal={(id) => setRejectModal(id)}
                  onOpenLightbox={handleViewReceipt}
                  actionLoading={actionLoading}
                  userSubRole={userSubRole}
          currentUserId={currentUserId}
                  orderMap={orderMap}
                  cashReceivedBy={cashReceivedBy}
                  setCashReceivedBy={setCashReceivedBy}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'caja' && (
        <CashMovementsTab
          cashMovements={cashMovements}
          loading={loading}
          onRefresh={fetchData}
          cajaDateFrom={cajaDateFrom}
          setCajaDateFrom={setCajaDateFrom}
          cajaDateTo={cajaDateTo}
          setCajaDateTo={setCajaDateTo}
          cajaSubTab={cajaSubTab}
          setCajaSubTab={setCajaSubTab}
          dailySearchTerm={dailySearchTerm}
          setDailySearchTerm={setDailySearchTerm}
          showEntryModal={showEntryModal}
          setShowEntryModal={setShowEntryModal}
          entryForm={entryForm}
          setEntryForm={setEntryForm}
          entrySubmitting={entrySubmitting}
          onRegisterEntry={handleRegisterEntry}
          showExitModal={showExitModal}
          setShowExitModal={setShowExitModal}
          exitForm={exitForm}
          setExitForm={setExitForm}
          exitSubmitting={exitSubmitting}
          onRegisterExit={handleRegisterExit}
          editModal={editModal}
          setEditModal={setEditModal}
          editForm={editForm}
          setEditForm={setEditForm}
          editSubmitting={editSubmitting}
          onEditMovement={handleEditMovement}
          onDeleteMovement={handleDeleteMovement}
          showAuditModal={showAuditModal}
          setShowAuditModal={setShowAuditModal}
          auditForm={auditForm}
          setAuditForm={setAuditForm}
          auditSubmitting={auditSubmitting}
          onPerformAudit={handlePerformAudit}
          cashAudits={cashAudits}
          onSignExit={handleSignExit}
          userSubRole={userSubRole}
          onExportExcel={exportPaymentsXLSX}
          actionLoading={actionLoading}
          onApplyAudit={handleApplyAudit}
        />
      )}

      {activeTab === 'conciliacion' && (
        <ReconciliationTab
          payments={safePayments}
          parsedMovements={parsedMovements}
          matchResults={matchResults}
          onParseCSV={parseBankCSV}
          onParsePDF={parsePDFStatement}
          actionLoading={actionLoading}
        />
      )}

      {/* Rejection Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Rechazar Pago</h3>
            <p className="text-xs text-slate-500">
              Especifica la razón del rechazo para informar al distribuidor.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej. Importe no coincide con el depósito..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRejectPayment(rejectModal)}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <ReceiptLightbox
        lightboxImg={lightboxImg}
        onClose={() => setLightboxImg(null)}
      />
    </div>
  );
}
