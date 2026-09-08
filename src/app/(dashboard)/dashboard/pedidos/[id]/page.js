'use client';
import React from 'react';
import { Loader2, PackageX } from 'lucide-react';
import { useOrderDetail } from '@/hooks/useOrderDetail';

import OrderDetailHeader from './components/OrderDetailHeader';
import OrderItemsCard from './components/OrderItemsCard';
import OrderEvidenceCard from './components/OrderEvidenceCard';
import OrderPaymentsCard from './components/OrderPaymentsCard';
import OrderSidebar from './components/OrderSidebar';
import AdminOrderActions from './components/AdminOrderActions';

import RejectionModal from './components/modals/RejectionModal';
import PaymentModal from './components/modals/PaymentModal';
import CancelOrderModal from './components/modals/CancelOrderModal';
import IncidentModal from './components/modals/IncidentModal';
import TransportDataModal from './components/modals/TransportDataModal';
import FulfillmentScannerModal from './components/modals/FulfillmentScannerModal';

export default function OrderDetailsPage() {
  const {
    order, payments, evidence, evidenceTab, setEvidenceTab, uploading, lightboxImg, setLightboxImg,
    loading, actionLoading, receivingOrder, submittingIncident,
    isAdmin, isSuperAdmin,
    warehouses, warehouseStock,
    showRejectModal, setShowRejectModal, rejectionReason, setRejectionReason,
    showPaymentModal, setShowPaymentModal, paymentForm, setPaymentForm,
    showCancelModal, setShowCancelModal, cancelReason, setCancelReason,
    showIncidentModal, setShowIncidentModal, incidentForm, setIncidentForm,
    showTransportModal, setShowTransportModal, transportData, setTransportData, pendingPrintWindow, setPendingPrintWindow,
    showFulfillmentScan, setShowFulfillmentScan, fulfilledQty, setFulfilledQty, scanFeedback, setScanFeedback,
    showFulfillScanner, setShowFulfillScanner,
    fulfillSearchTerm, setFulfillSearchTerm, fulfillSearchRef,
    editingItems, setEditingItems, editingPrices, setEditingPrices,
    showAddProduct, setShowAddProduct, productSearch, setProductSearch, availableProducts,
    allItemsHaveWarehouse,
    handleAssignWarehouse,
    handleReceiveOrder,
    handleReportIncident,
    initFulfillmentScan,
    handleFulfillmentScan,
    openFulfillScanner,
    closeFulfillScanner,
    handleFulfillSearchKeyDown,
    handleFulfillSearchChange,
    handleConfirmOrder,
    openLoadingSheetPrompt,
    printLoadingSheet,
    handleUpdateStatus,
    handleCancelOrder,
    handleReject,
    handleDeleteItem,
    handleUpdateQuantity,
    handleUpdatePrice,
    handleRegisterPayment,
    handleEvidenceUpload,
    handleDeleteEvidence,
    handleAddProduct,
    handleReorder,
  } = useOrderDetail();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando detalle del pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
          <PackageX className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Pedido no encontrado</h3>
        <p className="text-xs text-slate-500 max-w-sm">No pudimos encontrar el pedido solicitado o no tienes permisos para acceder.</p>
      </div>
    );
  }

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = Number(order.total_amount || 0) - totalPaid;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 pb-24">
      {/* Header Banner */}
      <OrderDetailHeader
        order={order}
        isAdmin={isAdmin}
        payments={payments}
        openLoadingSheetPrompt={openLoadingSheetPrompt}
        handleReorder={handleReorder}
      />

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Details & Evidence) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <OrderItemsCard
            order={order}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            warehouses={warehouses}
            warehouseStock={warehouseStock}
            editingItems={editingItems}
            setEditingItems={setEditingItems}
            editingPrices={editingPrices}
            setEditingPrices={setEditingPrices}
            handleAssignWarehouse={handleAssignWarehouse}
            handleUpdateQuantity={handleUpdateQuantity}
            handleDeleteItem={handleDeleteItem}
            handleUpdatePrice={handleUpdatePrice}
            showAddProduct={showAddProduct}
            setShowAddProduct={setShowAddProduct}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            availableProducts={availableProducts}
            handleAddProduct={handleAddProduct}
            actionLoading={actionLoading}
          />

          {/* Evidence Photos Section */}
          <OrderEvidenceCard
            order={order}
            evidence={evidence}
            evidenceTab={evidenceTab}
            setEvidenceTab={setEvidenceTab}
            uploading={uploading}
            handleEvidenceUpload={handleEvidenceUpload}
            handleDeleteEvidence={handleDeleteEvidence}
            lightboxImg={lightboxImg}
            setLightboxImg={setLightboxImg}
          />

          {/* Payments Section */}
          <OrderPaymentsCard
            order={order}
            payments={payments}
            isAdmin={isAdmin}
            setShowPaymentModal={setShowPaymentModal}
          />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <OrderSidebar
            order={order}
            isAdmin={isAdmin}
            setShowIncidentModal={setShowIncidentModal}
            receivingOrder={receivingOrder}
            handleReceiveOrder={handleReceiveOrder}
          />

          {/* Admin Operational Actions Card */}
          <AdminOrderActions
            order={order}
            isAdmin={isAdmin}
            evidence={evidence}
            actionLoading={actionLoading}
            allItemsHaveWarehouse={allItemsHaveWarehouse}
            handleConfirmOrder={handleConfirmOrder}
            handleUpdateStatus={handleUpdateStatus}
            setShowRejectModal={setShowRejectModal}
            setShowCancelModal={setShowCancelModal}
            openLoadingSheetPrompt={openLoadingSheetPrompt}
            initFulfillmentScan={initFulfillmentScan}
            setShowFulfillmentScan={setShowFulfillmentScan}
          />
        </div>
      </div>

      {/* Interactive Modals */}
      <RejectionModal
        showRejectModal={showRejectModal}
        setShowRejectModal={setShowRejectModal}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        handleReject={handleReject}
        actionLoading={actionLoading}
      />

      <PaymentModal
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        handleRegisterPayment={handleRegisterPayment}
        actionLoading={actionLoading}
        balance={balance}
      />

      <CancelOrderModal
        showCancelModal={showCancelModal}
        setShowCancelModal={setShowCancelModal}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelOrder={handleCancelOrder}
        actionLoading={actionLoading}
      />

      <IncidentModal
        showIncidentModal={showIncidentModal}
        setShowIncidentModal={setShowIncidentModal}
        incidentForm={incidentForm}
        setIncidentForm={setIncidentForm}
        handleReportIncident={handleReportIncident}
        submittingIncident={submittingIncident}
      />

      <TransportDataModal
        showTransportModal={showTransportModal}
        setShowTransportModal={setShowTransportModal}
        transportData={transportData}
        setTransportData={setTransportData}
        pendingPrintWindow={pendingPrintWindow}
        printLoadingSheet={printLoadingSheet}
      />

      <FulfillmentScannerModal
        showFulfillmentScan={showFulfillmentScan}
        setShowFulfillmentScan={setShowFulfillmentScan}
        order={order}
        fulfilledQty={fulfilledQty}
        scanFeedback={scanFeedback}
        showFulfillScanner={showFulfillScanner}
        openFulfillScanner={openFulfillScanner}
        closeFulfillScanner={closeFulfillScanner}
        fulfillSearchTerm={fulfillSearchTerm}
        setFulfillSearchTerm={setFulfillSearchTerm}
        fulfillSearchRef={fulfillSearchRef}
        handleFulfillSearchKeyDown={handleFulfillSearchKeyDown}
        handleFulfillSearchChange={handleFulfillSearchChange}
        handleUpdateStatus={handleUpdateStatus}
        actionLoading={actionLoading}
      />
    </div>
  );
}
