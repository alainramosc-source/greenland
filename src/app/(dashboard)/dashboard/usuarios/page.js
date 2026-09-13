'use client';
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useUsersAndCxc } from '@/hooks/useUsersAndCxc';
import UsersHeader from './components/UsersHeader';
import DistributorsTab from './components/DistributorsTab';
import AdminsTab from './components/AdminsTab';
import CxcTab from './components/CxcTab';

// Modals
import EditUserModal from './components/modals/EditUserModal';
import CreateCollaboratorModal from './components/modals/CreateCollaboratorModal';
import BadgeGeneratorModal from './components/modals/BadgeGeneratorModal';
import DeleteUserModal from './components/modals/DeleteUserModal';

export default function UsersPage() {
  const {
    activeTab, setActiveTab,
    users, loading, searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    distributors, admins,
    filteredDistributors, filteredAdmins,
    selectedUser, setSelectedUser, isModalOpen, setIsModalOpen, updating,
    selectedUsers, setSelectedUsers, sortConfig, handleSort,
    deleteModal, setDeleteModal, confirmDelete,
    badgeUser, setBadgeUser, showEditBadgeTexts, setShowEditBadgeTexts,
    badgeSettings, setBadgeSettings, downloadingFront, downloadingBack, downloadBadgeImage,
    showNewCollab, setShowNewCollab, newCollab, setNewCollab, creatingCollab, handleCreateCollaborator,
    unauthorized,
    cxcData, cxcLoading, cxcSearch, setCxcSearch, cxcSort, setCxcSort, filteredCxc,
    totalGlobalFacturado, totalGlobalPagado, totalGlobalBalance,
    exportingReport, exportDistributorReport, exportUsersCsv,
    expandedUserId, setExpandedUserId, addressCache, addressLoading, toggleAddressDrawer,
    allWarehouses, handleEditClick, handleSaveUser, handleSelectAll, handleSelectUser,
    handleDeleteSelected, handleDeleteSingle, getInitials
  } = useUsersAndCxc();

  if (unauthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">Acceso No Autorizado</h2>
        <p className="text-xs text-slate-500 max-w-md m-0">
          No tienes permisos suficientes para acceder a la gestión de usuarios y cuentas por cobrar. Contacta al administrador principal si necesitas acceso.
        </p>
      </div>
    );
  }

  const currentUsersToExport = activeTab === 'administradores' ? filteredAdmins : filteredDistributors;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header & Tabs */}
      <UsersHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        distributorsCount={distributors.length}
        adminsCount={admins.length}
        onOpenNewCollab={() => setShowNewCollab(true)}
        onExportCsv={() => exportUsersCsv(currentUsersToExport)}
      />

      {/* Main Tab Content */}
      {activeTab === 'distribuidores' && (
        <DistributorsTab
          distributors={distributors}
          filteredDistributors={filteredDistributors}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortConfig={sortConfig}
          handleSort={handleSort}
          selectedUsers={selectedUsers}
          handleSelectAll={handleSelectAll}
          handleSelectUser={handleSelectUser}
          handleDeleteSelected={handleDeleteSelected}
          handleEditClick={handleEditClick}
          handleDeleteSingle={handleDeleteSingle}
          exportUsersCsv={exportUsersCsv}
          expandedUserId={expandedUserId}
          toggleAddressDrawer={toggleAddressDrawer}
          addressCache={addressCache}
          addressLoading={addressLoading}
          allWarehouses={allWarehouses}
          getInitials={getInitials}
        />
      )}

      {activeTab === 'administradores' && (
        <AdminsTab
          admins={admins}
          filteredAdmins={filteredAdmins}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortConfig={sortConfig}
          handleSort={handleSort}
          selectedUsers={selectedUsers}
          handleSelectAll={handleSelectAll}
          handleSelectUser={handleSelectUser}
          handleDeleteSelected={handleDeleteSelected}
          handleEditClick={handleEditClick}
          handleDeleteSingle={handleDeleteSingle}
          setBadgeUser={setBadgeUser}
          setShowNewCollab={setShowNewCollab}
          exportUsersCsv={exportUsersCsv}
          allWarehouses={allWarehouses}
          getInitials={getInitials}
        />
      )}

      {activeTab === 'cxc' && (
        <CxcTab
          cxcData={cxcData}
          cxcLoading={cxcLoading}
          cxcSearch={cxcSearch}
          setCxcSearch={setCxcSearch}
          cxcSort={cxcSort}
          setCxcSort={setCxcSort}
          filteredCxc={filteredCxc}
          totalGlobalFacturado={totalGlobalFacturado}
          totalGlobalPagado={totalGlobalPagado}
          totalGlobalBalance={totalGlobalBalance}
          exportingReport={exportingReport}
          exportDistributorReport={exportDistributorReport}
          getInitials={getInitials}
        />
      )}

      {/* Modals */}
      <EditUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        handleSaveUser={handleSaveUser}
        updating={updating}
        allWarehouses={allWarehouses}
        allUsers={users}
      />

      <CreateCollaboratorModal
        isOpen={showNewCollab}
        onClose={() => setShowNewCollab(false)}
        newCollab={newCollab}
        setNewCollab={setNewCollab}
        handleCreateCollaborator={handleCreateCollaborator}
        creatingCollab={creatingCollab}
      />

      <BadgeGeneratorModal
        badgeUser={badgeUser}
        setBadgeUser={setBadgeUser}
        badgeSettings={badgeSettings}
        setBadgeSettings={setBadgeSettings}
        showEditBadgeTexts={showEditBadgeTexts}
        setShowEditBadgeTexts={setShowEditBadgeTexts}
        downloadingFront={downloadingFront}
        downloadingBack={downloadingBack}
        downloadBadgeImage={downloadBadgeImage}
      />

      <DeleteUserModal
        deleteModal={deleteModal}
        setDeleteModal={setDeleteModal}
        confirmDelete={confirmDelete}
        selectedUsersCount={selectedUsers.length}
      />
    </div>
  );
}
