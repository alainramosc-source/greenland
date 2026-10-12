'use client';
import { useRecycling } from '@/hooks/useRecycling';
import {
  Recycle, ShoppingCart, Send, Package, FileText, Settings,
  Loader2, Check, X
} from 'lucide-react';

import MaterialPurchaseView from './components/MaterialPurchaseView';
import MaterialSalesView from './components/MaterialSalesView';
import RecyclingInventoryView from './components/RecyclingInventoryView';
import MovementHistoryView from './components/MovementHistoryView';
import MaterialSettingsView from './components/MaterialSettingsView';

import BuyerPinModal from './components/BuyerPinModal';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import EditMovementModal from './components/EditMovementModal';

export default function RecyclingPage() {
  const recycling = useRecycling();

  if (recycling.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 size={36} className="animate-spin text-emerald-600" />
        <p className="text-xs font-bold text-slate-400 animate-pulse">Cargando Módulo de Reciclaje...</p>
      </div>
    );
  }

  const TABS = [
    { key: 'compra', label: 'Nueva Compra', icon: ShoppingCart },
    { key: 'venta', label: 'Nueva Venta', icon: Send },
    { key: 'inventario', label: 'Inventario', icon: Package },
    { key: 'historial', label: 'Historial', icon: FileText },
    { key: 'config', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* Toast Notification */}
      {recycling.toast && (
        <div
          className={`fixed top-24 right-6 z-[9999] px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-extrabold text-white flex items-center gap-2.5 transition-all border border-white/20 ${
            recycling.toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
          }`}
          style={{ animation: 'slideIn 0.3s ease' }}
        >
          {recycling.toast.type === 'error' ? <X size={18} /> : <Check size={18} />}
          {recycling.toast.message}
        </div>
      )}

      {/* Top Main Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/70 backdrop-blur-xl border border-white/60 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Recycle size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Módulo de Reciclaje <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">PRO</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Gestión de compra, venta, existencias y auditoría de materiales</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 flex-wrap gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = recycling.activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => recycling.setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md shadow-slate-200/80'
                    : 'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <main>
        {recycling.activeTab === 'compra' && (
          <MaterialPurchaseView
            activeMaterials={recycling.activeMaterials}
            filteredSuppliers={recycling.filteredSuppliers}
            purchaseForm={recycling.purchaseForm}
            setPurchaseForm={recycling.setPurchaseForm}
            supplierSearch={recycling.supplierSearch}
            setSupplierSearch={recycling.setSupplierSearch}
            showSupplierDropdown={recycling.showSupplierDropdown}
            setShowSupplierDropdown={recycling.setShowSupplierDropdown}
            submittingPurchase={recycling.submittingPurchase}
            purchaseTotal={recycling.purchaseTotal}
            handleMaterialChange={recycling.handleMaterialChange}
            handleSupplierSelect={recycling.handleSupplierSelect}
            handleSubmitPurchase={recycling.handleSubmitPurchase}
            activeBuyer={recycling.activeBuyer}
            setActiveBuyer={recycling.setActiveBuyer}
            setShowBuyerPinModal={recycling.setShowBuyerPinModal}
            setBuyerPinInput={recycling.setBuyerPinInput}
            setBuyerModalError={recycling.setBuyerModalError}
            setPendingPurchaseAction={recycling.setPendingPurchaseAction}
            purchases={recycling.purchases}
          />
        )}

        {recycling.activeTab === 'venta' && (
          <MaterialSalesView
            activeMaterials={recycling.activeMaterials}
            stockByMaterial={recycling.stockByMaterial}
            multiSaleBuyer={recycling.multiSaleBuyer}
            setMultiSaleBuyer={recycling.setMultiSaleBuyer}
            multiSaleNotes={recycling.multiSaleNotes}
            setMultiSaleNotes={recycling.setMultiSaleNotes}
            multiSaleRows={recycling.multiSaleRows}
            submittingMultiSale={recycling.submittingMultiSale}
            multiSaleSummary={recycling.multiSaleSummary}
            handleAddSaleRow={recycling.handleAddSaleRow}
            handleRemoveSaleRow={recycling.handleRemoveSaleRow}
            handleSaleRowChange={recycling.handleSaleRowChange}
            handleSubmitMultiSale={recycling.handleSubmitMultiSale}
          />
        )}

        {recycling.activeTab === 'inventario' && (
          <RecyclingInventoryView
            stockArray={recycling.stockArray}
            totals={recycling.totals}
            openAdjustmentModal={recycling.openAdjustmentModal}
            isAdmin={recycling.isAdmin}
          />
        )}

        {recycling.activeTab === 'historial' && (
          <MovementHistoryView
            historyItems={recycling.historyItems}
            historyFilter={recycling.historyFilter}
            setHistoryFilter={recycling.setHistoryFilter}
            exportHistoryExcel={recycling.exportHistoryExcel}
            materialTypes={recycling.materialTypes}
            openEditMovementModal={recycling.openEditMovementModal}
            handleDeleteMovement={recycling.handleDeleteMovement}
            isAdmin={recycling.isAdmin}
          />
        )}

        {recycling.activeTab === 'config' && (
          <MaterialSettingsView
            materialTypes={recycling.materialTypes}
            suppliers={recycling.suppliers}
            newMaterial={recycling.newMaterial}
            setNewMaterial={recycling.setNewMaterial}
            editingMaterial={recycling.editingMaterial}
            setEditingMaterial={recycling.setEditingMaterial}
            newSupplier={recycling.newSupplier}
            setNewSupplier={recycling.setNewSupplier}
            editingSupplier={recycling.editingSupplier}
            setEditingSupplier={recycling.setEditingSupplier}
            showAddMaterial={recycling.showAddMaterial}
            setShowAddMaterial={recycling.setShowAddMaterial}
            showAddSupplier={recycling.showAddSupplier}
            setShowAddSupplier={recycling.setShowAddSupplier}
            handleAddMaterial={recycling.handleAddMaterial}
            handleUpdateMaterial={recycling.handleUpdateMaterial}
            handleToggleMaterial={recycling.handleToggleMaterial}
            handleAddSupplier={recycling.handleAddSupplier}
            handleUpdateSupplier={recycling.handleUpdateSupplier}
            handleToggleSupplier={recycling.handleToggleSupplier}
          />
        )}
      </main>

      {/* Global Modals */}
      <BuyerPinModal
        isOpen={recycling.showBuyerPinModal}
        onClose={() => recycling.setShowBuyerPinModal(false)}
        buyerPinInput={recycling.buyerPinInput}
        setBuyerPinInput={recycling.setBuyerPinInput}
        buyerModalError={recycling.buyerModalError}
        verifyingBuyer={recycling.verifyingBuyer}
        rememberBuyer={recycling.rememberBuyer}
        setRememberBuyer={recycling.setRememberBuyer}
        verifyBuyerPin={recycling.verifyBuyerPin}
        handleKeypadPress={recycling.handleKeypadPress}
      />

      <StockAdjustmentModal
        adjustModal={recycling.adjustModal}
        setAdjustModal={recycling.setAdjustModal}
        adjustForm={recycling.adjustForm}
        setAdjustForm={recycling.setAdjustForm}
        submittingAdjustment={recycling.submittingAdjustment}
        handleSubmitAdjustment={recycling.handleSubmitAdjustment}
      />

      <EditMovementModal
        editingMovementModal={recycling.editingMovementModal}
        setEditingMovementModal={recycling.setEditingMovementModal}
        editMovementForm={recycling.editMovementForm}
        setEditMovementForm={recycling.setEditMovementForm}
        submittingEditMovement={recycling.submittingEditMovement}
        handleSaveMovementEdit={recycling.handleSaveMovementEdit}
        materialTypes={recycling.materialTypes}
      />
    </div>
  );
}
