'use client';
import React from 'react';
import { Search, Package, Truck, X } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import ExpressLinkModal from '@/components/delivery/ExpressLinkModal';
import DeliveryOrderDetailModal from '@/components/delivery/DeliveryOrderDetailModal';
import SettleRouteModal from '@/components/delivery/SettleRouteModal';
import DistributorOrdersTab from './components/DistributorOrdersTab';
import HomeDeliveryTab from './components/HomeDeliveryTab';
import NewDeliverySaleModal from './components/NewDeliverySaleModal';

export default function PedidosPage() {
  const {
    supabase,
    orders,
    filteredOrders,
    loading,
    isAdmin,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    deliveryOrders,
    refreshDeliveryOrders,
    showNewSale,
    setShowNewSale,
    showExpressModal,
    setShowExpressModal,
    selectedDeliveryOrder,
    setSelectedDeliveryOrder,
    showSettleModal,
    setShowSettleModal,
    copiedToken,
    setCopiedToken,
    counts,
    totalAmount,
    pendingPayment,
    overdueOrders,
    deleteOrder,
    handleExportOrders,
    handlePrintOrders,
  } = usePedidos();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Executive Top Header Bar */}
      <header className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center text-[#6a9a04] shadow-sm shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 m-0">
              {isAdmin ? 'Centro de Pedidos' : 'Mis Pedidos'}
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] border border-[#6a9a04]/20">
                {isAdmin ? 'B2B & Logistics' : 'Portal Distribuidor'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 m-0">
              {isAdmin
                ? 'Monitoreo de órdenes mayoristas, surtido y despachos de última milla en tiempo real'
                : 'Consulta el estatus de tus órdenes, saldos y solicita reposición de inventario'}
            </p>
          </div>
        </div>

        {/* Search + Segmented Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6a9a04] transition-colors" />
            <input
              type="text"
              placeholder="Buscar folio, cliente, ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50/90 border border-slate-200/80 pl-10 pr-8 py-2 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/25 focus:border-[#6a9a04]/40 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setActiveTab('distributor')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === 'distributor'
                    ? 'bg-white text-[#6a9a04] shadow-sm border-slate-200/60'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Distribuidores</span>
                <span className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                  activeTab === 'distributor' ? 'bg-[#6a9a04]/10 text-[#6a9a04]' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('envios')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === 'envios'
                    ? 'bg-white text-[#6a9a04] shadow-sm border-slate-200/60'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Envíos a Domicilio</span>
                {deliveryOrders.length > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                    activeTab === 'envios' ? 'bg-[#6a9a04]/10 text-[#6a9a04]' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {deliveryOrders.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* TAB 1: Pedidos de Distribuidores */}
      {activeTab === 'distributor' && (
        <DistributorOrdersTab
          isAdmin={isAdmin}
          orders={orders}
          filteredOrders={filteredOrders}
          loading={loading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          counts={counts}
          totalAmount={totalAmount}
          pendingPayment={pendingPayment}
          overdueOrders={overdueOrders}
          deleteOrder={deleteOrder}
          handleExportOrders={handleExportOrders}
          handlePrintOrders={handlePrintOrders}
        />
      )}

      {/* TAB 2: Envíos a Domicilio */}
      {isAdmin && activeTab === 'envios' && (
        <HomeDeliveryTab
          deliveryOrders={deliveryOrders}
          searchTerm={searchTerm}
          setShowSettleModal={setShowSettleModal}
          setShowExpressModal={setShowExpressModal}
          setShowNewSale={setShowNewSale}
          setSelectedDeliveryOrder={setSelectedDeliveryOrder}
          copiedToken={copiedToken}
          setCopiedToken={setCopiedToken}
        />
      )}

      {/* New Manual Home Delivery Modal */}
      {showNewSale && (
        <NewDeliverySaleModal
          supabase={supabase}
          onClose={() => setShowNewSale(false)}
          onSaleCreated={() => { setShowNewSale(false); refreshDeliveryOrders(); }}
        />
      )}

      {/* Express Link Modal */}
      <ExpressLinkModal
        isOpen={showExpressModal}
        onClose={() => setShowExpressModal(false)}
        onLinkCreated={refreshDeliveryOrders}
      />

      {/* Delivery Order Detail & Return Modal */}
      <DeliveryOrderDetailModal
        order={selectedDeliveryOrder ? (deliveryOrders.find(o => o.id === selectedDeliveryOrder.id) || selectedDeliveryOrder) : null}
        isOpen={!!selectedDeliveryOrder}
        onClose={() => setSelectedDeliveryOrder(null)}
        onOrderUpdated={refreshDeliveryOrders}
      />

      {/* Route Settlement Modal */}
      <SettleRouteModal
        isOpen={showSettleModal}
        orders={deliveryOrders}
        onClose={() => setShowSettleModal(false)}
        onSettled={refreshDeliveryOrders}
      />
    </div>
  );
}
