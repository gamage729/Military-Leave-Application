import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Users, 
  Calendar, 
  Eye,
  Filter,
  Search,
  Download,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Mail,
  Phone
} from 'lucide-react';

const AdminPanel = () => {
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: "1",
      soldierId: "123456",
      soldierName: "tstuser",
      rank: "Private",
      unit: "Alpha Company",
      email: "testuser@gmail.com",
      leaveType: "Medical",
      startDate: "2025-06-16",
      endDate: "2025-06-21",
      leaveDays: 6,
      reason: "Experiencing high fever and body aches due to suspected viral infection; advised rest by medical officer.",
      status: "pending",
      createdAt: "2025-06-16",
      approvedBy: null,
      documents: ["non"]
    },
    {
      id: "2",
      soldierId: "789012",
      soldierName: "Sarah Johnson",
      rank: "Sergeant",
      unit: "Bravo Company",
      email: "sarah.johnson@military.gov",
      phone: "+44 987 654 3210",
      leaveType: "Medical",
      startDate: "2024-06-20",
      endDate: "2024-06-25",
      leaveDays: 5,
      reason: "Scheduled surgery and recovery time",
      status: "approved",
      createdAt: "2024-06-10",
      approvedBy: "admin@military.gov",
      documents: ["medical-certificate.pdf"]
    },
    {
      id: "3",
      soldierId: "345678",
      soldierName: "Mike Wilson",
      rank: "Corporal",
      unit: "Charlie Company",
      email: "mike.wilson@military.gov",
      phone: "+44 555 123 4567",
      leaveType: "Compassionate",
      startDate: "2024-06-18",
      endDate: "2024-06-22",
      leaveDays: 4,
      reason: "Family emergency - grandmother's funeral",
      status: "rejected",
      createdAt: "2024-06-12",
      approvedBy: "admin@military.gov",
      documents: []
    }
  ]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Calculate statistics
  useEffect(() => {
    const newStats = leaveRequests.reduce((acc, request) => {
      acc.total++;
      acc[request.status]++;
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0 });
    
    setStats(newStats);
  }, [leaveRequests]);

  // Filter and search requests
  const filteredRequests = leaveRequests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = searchTerm === '' || 
      request.soldierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.soldierId.includes(searchTerm) ||
      request.unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleApprove = (requestId) => {
    setLeaveRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', approvedBy: 'admin@military.gov' }
          : req
      )
    );
  };

  const handleReject = (requestId) => {
    setLeaveRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected', approvedBy: 'admin@military.gov' }
          : req
      )
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '24px',
      border: '1px solid #374151'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 8px 0' }}>{title}</p>
          <p style={{ 
            fontSize: '30px', 
            fontWeight: 'bold', 
            color: color,
            margin: '0'
          }}>{value}</p>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '12px', 
            marginTop: '4px',
            margin: '4px 0 0 0'
          }}>{description}</p>
        </div>
        <Icon style={{ color: color, opacity: 0.75 }} size={24} />
      </div>
    </div>
  );

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#111827',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      backgroundColor: '#1f2937',
      borderBottom: '1px solid #374151',
      padding: '16px 24px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    headerBrand: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      margin: 0
    },
    headerSubtitle: {
      fontSize: '14px',
      color: '#9ca3af',
      margin: 0
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    headerIcon: {
      color: '#9ca3af',
      cursor: 'pointer'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    mainLayout: {
      display: 'flex'
    },
    sidebar: {
      width: '256px',
      backgroundColor: '#1f2937',
      borderRight: '1px solid #374151',
      minHeight: 'calc(100vh - 73px)'
    },
    sidebarNav: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    sidebarButton: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      textAlign: 'left',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    sidebarButtonActive: {
      backgroundColor: '#ea580c',
      color: 'white'
    },
    sidebarButtonInactive: {
      backgroundColor: 'transparent',
      color: '#9ca3af'
    },
    mainContent: {
      flex: 1,
      padding: '24px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    },
    filtersSection: {
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
    },
    filtersContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    filtersRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    },
    filtersLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    },
    filterGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    select: {
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '8px',
      padding: '8px 12px',
      color: 'white',
      fontSize: '14px'
    },
    input: {
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '8px',
      padding: '8px 12px',
      color: 'white',
      fontSize: '14px',
      width: '256px'
    },
    exportButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#ea580c',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    tableContainer: {
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: '#374151',
      borderBottom: '1px solid #4b5563'
    },
    tableHeaderCell: {
      textAlign: 'left',
      padding: '16px',
      fontWeight: '600',
      fontSize: '14px'
    },
    tableRow: {
      borderBottom: '1px solid #374151'
    },
    tableCell: {
      padding: '16px',
      fontSize: '14px'
    },
    soldierInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    soldierName: {
      fontWeight: '500'
    },
    soldierDetails: {
      color: '#9ca3af',
      fontSize: '12px'
    },
    soldierUnit: {
      color: '#6b7280',
      fontSize: '11px'
    },
    leaveType: {
      backgroundColor: '#374151',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      display: 'inline-block'
    },
    dateInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    dateSecondary: {
      color: '#9ca3af'
    },
    statusContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    actionsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    actionButton: {
      padding: '8px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      backgroundColor: 'transparent'
    },
    pagination: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '24px'
    },
    paginationInfo: {
      fontSize: '14px',
      color: '#9ca3af'
    },
    paginationButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    paginationButton: {
      padding: '8px 12px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '24px',
      width: '100%',
      maxWidth: '672px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      margin: 0
    },
    modalCloseButton: {
      color: '#9ca3af',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent'
    },
    modalSection: {
      backgroundColor: '#374151',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px'
    },
    modalSectionTitle: {
      fontWeight: '600',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    modalGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      fontSize: '14px'
    },
    modalField: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    modalFieldLabel: {
      color: '#9ca3af',
      fontSize: '12px'
    },
    modalFieldValue: {
      fontWeight: '500'
    },
    modalFieldFull: {
      gridColumn: 'span 2'
    },
    modalFieldIcon: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    documentsSection: {
      backgroundColor: '#374151',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px'
    },
    documentItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      backgroundColor: '#4b5563',
      borderRadius: '4px',
      marginBottom: '8px'
    },
    documentName: {
      fontSize: '14px',
      flex: 1
    },
    documentDownload: {
      color: '#f97316',
      cursor: 'pointer'
    },
    modalActions: {
      display: 'flex',
      gap: '16px',
      paddingTop: '16px'
    },
    modalActionButton: {
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    approveButton: {
      backgroundColor: '#059669',
      color: 'white'
    },
    rejectButton: {
      backgroundColor: '#dc2626',
      color: 'white'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.headerBrand}>
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGNTk2MDAiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+"
                alt="Military Badge" 
                style={{ width: '40px', height: '40px' }}
              />
              <div>
                <h1 style={styles.headerTitle}>Military Leave System</h1>
                <p style={styles.headerSubtitle}>Admin Panel</p>
              </div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <Bell style={styles.headerIcon} size={20} />
            <Settings style={styles.headerIcon} size={20} />
            <div style={styles.userInfo}>
              <User style={{ color: '#9ca3af' }} size={20} />
              <span style={{ fontSize: '14px' }}>Admin Officer</span>
              <ChevronDown style={{ color: '#9ca3af' }} size={16} />
            </div>
            <LogOut style={{ ...styles.headerIcon, color: '#ef4444' }} size={20} />
          </div>
        </div>
      </header>

      <div style={styles.mainLayout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <nav style={styles.sidebarNav}>
            <button style={{ ...styles.sidebarButton, ...styles.sidebarButtonActive }}>
              <FileText size={20} />
              <span>Leave Requests</span>
            </button>
            <button style={{ ...styles.sidebarButton, ...styles.sidebarButtonInactive }}>
              <Users size={20} />
              <span>Soldiers</span>
            </button>
            <button style={{ ...styles.sidebarButton, ...styles.sidebarButtonInactive }}>
              <Calendar size={20} />
              <span>Calendar</span>
            </button>
            <button style={{ ...styles.sidebarButton, ...styles.sidebarButtonInactive }}>
              <Download size={20} />
              <span>Reports</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Statistics Cards */}
          <div style={styles.statsGrid}>
            <StatCard
              title="Total Requests"
              value={stats.total}
              icon={FileText}
              color="#3b82f6"
              description="All time requests"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              icon={Clock}
              color="#f59e0b"
              description="Awaiting approval"
            />
            <StatCard
              title="Approved"
              value={stats.approved}
              icon={CheckCircle}
              color="#10b981"
              description="Granted leave"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color="#ef4444"
              description="Denied requests"
            />
          </div>

          {/* Filters and Search */}
          <div style={styles.filtersSection}>
            <div style={styles.filtersContent}>
              <div style={styles.filtersRow}>
                <div style={styles.filtersLeft}>
                  <div style={styles.filterGroup}>
                    <Filter size={20} style={{ color: '#9ca3af' }} />
                    <select 
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      style={styles.select}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div style={styles.filterGroup}>
                    <Search size={20} style={{ color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search soldiers, ID, or unit..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
                <button style={styles.exportButton}>
                  <Download size={16} />
                  <span>Export Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Soldier</th>
                  <th style={styles.tableHeaderCell}>Leave Type</th>
                  <th style={styles.tableHeaderCell}>Dates</th>
                  <th style={styles.tableHeaderCell}>Days</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={styles.soldierInfo}>
                        <div style={styles.soldierName}>{request.soldierName}</div>
                        <div style={styles.soldierDetails}>{request.rank} • {request.soldierId}</div>
                        <div style={styles.soldierUnit}>{request.unit}</div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.leaveType}>
                        {request.leaveType}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.dateInfo}>
                        <div>{new Date(request.startDate).toLocaleDateString()}</div>
                        <div style={styles.dateSecondary}>to {new Date(request.endDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{ fontWeight: '500' }}>{request.leaveDays}</span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.statusContainer, color: getStatusColor(request.status) }}>
                        {getStatusIcon(request.status)}
                        <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{request.status}</span>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actionsContainer}>
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          style={{ ...styles.actionButton, color: '#9ca3af' }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApprove(request.id)}
                              style={{ ...styles.actionButton, color: '#10b981' }}
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleReject(request.id)}
                              style={{ ...styles.actionButton, color: '#ef4444' }}
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            <p style={styles.paginationInfo}>
              Showing {filteredRequests.length} of {leaveRequests.length} requests
            </p>
            <div style={styles.paginationButtons}>
              <button style={{ ...styles.paginationButton, backgroundColor: '#374151', color: '#9ca3af' }}>
                Previous
              </button>
              <button style={{ ...styles.paginationButton, backgroundColor: '#ea580c', color: 'white' }}>
                1
              </button>
              <button style={{ ...styles.paginationButton, backgroundColor: '#374151', color: '#9ca3af' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Request Details */}
      {showModal && selectedRequest && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Leave Request Details</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={styles.modalCloseButton}
              >
                <XCircle size={24} />
              </button>
            </div>

            <div>
              {/* Soldier Information */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <User size={18} />
                  Soldier Information
                </h3>
                <div style={styles.modalGrid}>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Name</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.soldierName}</p>
                  </div>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Rank</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.rank}</p>
                  </div>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Soldier ID</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.soldierId}</p>
                  </div>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Unit</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.unit}</p>
                  </div>
                  <div style={{ ...styles.modalField, ...styles.modalFieldIcon }}>
                    <Mail style={{ color: '#9ca3af' }} size={14} />
                    <p style={{ fontSize: '14px' }}>{selectedRequest.email}</p>
                  </div>
                  <div style={{ ...styles.modalField, ...styles.modalFieldIcon }}>
                    <Phone style={{ color: '#9ca3af' }} size={14} />
                    <p style={{ fontSize: '14px' }}>{selectedRequest.phone}</p>
                  </div>
                </div>
              </div>

              {/* Leave Details */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <Calendar size={18} />
                  Leave Details
                </h3>
                <div style={styles.modalGrid}>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Leave Type</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.leaveType}</p>
                  </div>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Duration</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.leaveDays} days</p>
                  </div>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>Start Date</p>
                    <p style={styles.modalFieldValue}>{new Date(selectedRequest.startDate).toLocaleDateString()}</p>
                  </div>
                  <div style={styles.modalField}>
                    <p style={styles.modalFieldLabel}>End Date</p>
                    <p style={styles.modalFieldValue}>{new Date(selectedRequest.endDate).toLocaleDateString()}</p>
                  </div>
                  <div style={{ ...styles.modalField, ...styles.modalFieldFull }}>
                    <p style={styles.modalFieldLabel}>Reason</p>
                    <p style={styles.modalFieldValue}>{selectedRequest.reason}</p>
                  </div>
                  <div style={{ ...styles.modalField, ...styles.modalFieldFull }}>
                    <p style={styles.modalFieldLabel}>Status</p>
                    <div style={{ ...styles.statusContainer, color: getStatusColor(selectedRequest.status) }}>
                      {getStatusIcon(selectedRequest.status)}
                      <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{selectedRequest.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                <div style={styles.documentsSection}>
                  <h3 style={styles.modalSectionTitle}>
                    <FileText size={18} />
                    Attached Documents
                  </h3>
                  <div>
                    {selectedRequest.documents.map((doc, index) => (
                      <div key={index} style={styles.documentItem}>
                        <FileText size={16} />
                        <span style={styles.documentName}>{doc}</span>
                        <button style={styles.documentDownload}>
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && (
                <div style={styles.modalActions}>
                  <button 
                    onClick={() => {
                      handleApprove(selectedRequest.id);
                      setShowModal(false);
                    }}
                    style={{ ...styles.modalActionButton, ...styles.approveButton }}
                  >
                    <CheckCircle size={18} />
                    <span>Approve Request</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleReject(selectedRequest.id);
                      setShowModal(false);
                    }}
                    style={{ ...styles.modalActionButton, ...styles.rejectButton }}
                  >
                    <XCircle size={18} />
                    <span>Reject Request</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;