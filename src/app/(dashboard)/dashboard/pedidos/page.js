'use client';
import React from 'react';
import { Search, Package, Truck } from 'lucide-react';
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
    <>
      <div className="relative z-10 w-full">
        {/* Page Header (Search) */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-black text-[#000000] tracking-tight">{isAdmin ? 'Pedidos' : 'Mis Pedidos'}</h1>
            <p className="text-[#747474] mt-1 font-medium">
              {isAdmin ? 'Gestiona y monitorea las órdenes en tiempo real.' : 'Consulta tus pedidos y realiza nuevos pedidos.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6a9a04] transition-colors" />
              <input
                type="text"
                placeholder="Buscar pedidos, clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-panel pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-[#6a9a04]/30 border-none placeholder:text-slate-400 outline-none text-slate-800"
              />
            </div>
          </div>
        </header>

        {/* Tab Switcher */}
        {isAdmin && (
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('distributor')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                activeTab === 'distributor'
                  ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-lg shadow-[#6a9a04]/20'
                  : 'bg-white/50 text-slate-600 border-white/80 hover:bg-white'
              }`}
            >
              <Package className="w-4 h-4" /> Distribuidores
            </button>
            <button
              onClick={() => setActiveTab('envios')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                activeTab === 'envios'
                  ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-lg shadow-[#6a9a04]/20'
                  : 'bg-white/50 text-slate-600 border-white/80 hover:bg-white'
              }`}
            >
              <Truck className="w-4 h-4" /> Envíos a Domicilio
              {deliveryOrders.length > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  activeTab === 'envios' ? 'bg-white/20 text-white' : 'bg-[#6a9a04]/10 text-[#6a9a04]'
                }`}>
                  {deliveryOrders.length}
                </span>
              )}
            </button>
          </div>
        )}

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
      </div>

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

      <style jsx global>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .glass-card-hover {
          transition: all 0.3s ease;
        }
        .glass-card-hover:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
        }

        .glass-button {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.2s ease;
        }
        .glass-button:hover {
          background: rgba(255, 255, 255, 1);
        }

        .table-row-glass:hover {
          background: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </>
  );
}
