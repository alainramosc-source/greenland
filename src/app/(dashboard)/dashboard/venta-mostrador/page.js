'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';
import { useCounterSale } from '@/hooks/useCounterSale';
import PosHeader from './components/PosHeader';
import ProductSearchAndGrid from './components/ProductSearchAndGrid';
import CartSection from './components/CartSection';
import PaymentPad from './components/PaymentPad';
import ReceiptModal from './components/ReceiptModal';
import SellerPinModal from './components/SellerPinModal';
import SalesHistoryTab from './components/SalesHistoryTab';
import ReturnModal from './components/ReturnModal';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import RetailStatsTab from './RetailStatsTab';

export default function VentaMostradorPage() {
  const pos = useCounterSale();

  if (pos.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs font-bold gap-2">
        <Loader2 size={24} className="animate-spin text-[#6a9a04]" />
        <span>Cargando Punto de Venta...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Navigation */}
      <PosHeader
        activeTab={pos.activeTab}
        setActiveTab={pos.setActiveTab}
        warehouses={pos.warehouses}
        selectedWarehouse={pos.selectedWarehouse}
        setSelectedWarehouse={pos.setSelectedWarehouse}
        activeSeller={pos.activeSeller}
        setShowSellerPinModal={pos.setShowSellerPinModal}
        userName={pos.userName}
      />

      {/* VIEW: Nueva Venta (POS Checkout Layout) */}
      {pos.activeTab === 'nueva' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Search + Catalog Grid + Cart Items Table */}
          <div className="lg:col-span-8 space-y-6">
            <ProductSearchAndGrid
              searchTerm={pos.searchTerm}
              setSearchTerm={pos.setSearchTerm}
              searchResults={pos.searchResults}
              showSearchDropdown={pos.showSearchDropdown}
              setShowSearchDropdown={pos.setShowSearchDropdown}
              searchRef={pos.searchRef}
              searchInputRef={pos.searchInputRef}
              handleSearchKeyDown={pos.handleSearchKeyDown}
              addProductToSale={pos.addProductToSale}
              openScanner={pos.openScanner}
              scanFeedback={pos.scanFeedback}
              products={pos.products}
              selectedWarehouse={pos.selectedWarehouse}
              getAvailableStock={pos.getAvailableStock}
              pinnedProductIds={pos.pinnedProductIds}
              togglePinProduct={pos.togglePinProduct}
            />

            <CartSection
              saleItems={pos.saleItems}
              updateItemQuantity={pos.updateItemQuantity}
              updateItemPrice={pos.updateItemPrice}
              removeItem={pos.removeItem}
              resetSale={pos.resetSale}
              selectedWarehouse={pos.selectedWarehouse}
              getAvailableStock={pos.getAvailableStock}
            />
          </div>

          {/* Right Column: Commercial Payment Terminal Panel */}
          <div className="lg:col-span-4">
            <PaymentPad
              customerName={pos.customerName}
              setCustomerName={pos.setCustomerName}
              paymentMethod={pos.paymentMethod}
              setPaymentMethod={pos.setPaymentMethod}
              amountReceived={pos.amountReceived}
              setAmountReceived={pos.setAmountReceived}
              notes={pos.notes}
              setNotes={pos.setNotes}
              submitting={pos.submitting}
              saleTotal={pos.saleTotal}
              handleSubmitSale={pos.handleSubmitSale}
              resetSale={pos.resetSale}
            />
          </div>
        </div>
      )}

      {/* VIEW: Historial de Ventas */}
      {pos.activeTab === 'historial' && (
        <SalesHistoryTab
          salesHistory={pos.salesHistory}
          historialLoading={pos.historialLoading}
          historialSearch={pos.historialSearch}
          setHistorialSearch={pos.setHistorialSearch}
          expandedSale={pos.expandedSale}
          setExpandedSale={pos.setExpandedSale}
          hasMoreHistory={pos.hasMoreHistory}
          loadingMore={pos.loadingMore}
          fetchHistorial={pos.fetchHistorial}
          handleOpenReturnModal={pos.handleOpenReturnModal}
          handleLoadReturnedItemsToCart={pos.handleLoadReturnedItemsToCart}
          handlePrintReceiptForSale={pos.handlePrintReceiptForSale}
          shortName={pos.shortName}
        />
      )}

      {/* VIEW: Estadísticas */}
      {pos.activeTab === 'estadisticas' && (
        <RetailStatsTab />
      )}

      {/* MODALS */}
      <ReceiptModal
        showReceipt={pos.showReceipt}
        setShowReceipt={pos.setShowReceipt}
        receiptData={pos.receiptData}
        handlePrint={pos.handlePrint}
        receiptRef={pos.receiptRef}
        resetSale={pos.resetSale}
      />

      <SellerPinModal
        showSellerPinModal={pos.showSellerPinModal}
        setShowSellerPinModal={pos.setShowSellerPinModal}
        sellerPinInput={pos.sellerPinInput}
        setSellerPinInput={pos.setSellerPinInput}
        sellerModalError={pos.sellerModalError}
        rememberSeller={pos.rememberSeller}
        setRememberSeller={pos.setRememberSeller}
        verifyingSeller={pos.verifyingSeller}
        verifySellerPin={pos.verifySellerPin}
        handleKeypadPress={pos.handleKeypadPress}
      />

      <ReturnModal
        showReturnModal={pos.showReturnModal}
        setShowReturnModal={pos.setShowReturnModal}
        selectedSaleToReturn={pos.selectedSaleToReturn}
        returnReason={pos.returnReason}
        setReturnReason={pos.setReturnReason}
        signerAuthInput={pos.signerAuthInput}
        setSignerAuthInput={pos.setSignerAuthInput}
        processingReturn={pos.processingReturn}
        handleProcessReturn={pos.handleProcessReturn}
        returnSuccessData={pos.returnSuccessData}
        setReturnSuccessData={pos.setReturnSuccessData}
        handleLoadReturnedItemsToCart={pos.handleLoadReturnedItemsToCart}
      />

      <BarcodeScannerModal
        showScanner={pos.showScanner}
        closeScanner={pos.closeScanner}
      />
    </div>
  );
}
