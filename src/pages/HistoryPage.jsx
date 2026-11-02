import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EnrollmentHistoryTab from '../components/history/EnrollmentHistoryTab';
import PaymentHistoryTab from '../components/history/PaymentHistoryTab';
import LessonRequestHistoryTab from '../components/history/LessonRequestHistoryTab';
import TuteRequestHistoryTab from '../components/history/TuteRequestHistoryTab';
import HistoryDetailsModal from '../components/history/HistoryDetailsModal';

const TABS = [
  { id: 'enrollments', label: 'Course Enrollments', icon: '🎓', path: '/history/enrollments' },
  { id: 'payments', label: 'Payment & Orders', icon: '💳', path: '/history/payments' },
  { id: 'lessons', label: 'Lesson Requests', icon: '🎥', path: '/history/lesson-requests' },
  { id: 'tutes', label: 'Tute Requests', icon: '📦', path: '/history/tute-requests' },
];

export default function HistoryPage({ defaultTab }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from prop, pathname, or search query
  const getInitialTab = () => {
    if (defaultTab) return defaultTab;
    const path = location.pathname;
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/lesson-requests') || path.includes('/lessons')) return 'lessons';
    if (path.includes('/tute-requests') || path.includes('/tutes')) return 'tutes';
    if (path.includes('/enrollments')) return 'enrollments';

    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['enrollments', 'payments', 'lessons', 'tutes'].includes(tabParam)) {
      return tabParam;
    }
    return 'enrollments';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [modalData, setModalData] = useState({ open: false, type: '', item: null });

  useEffect(() => {
    const nextTab = getInitialTab();
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [location.pathname, location.search, defaultTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const target = TABS.find((t) => t.id === tabId);
    if (target) {
      navigate(target.path);
    }
  };

  const handleOpenDetails = (type, item) => {
    setModalData({ open: true, type, item });
  };

  const handleCloseDetails = () => {
    setModalData({ open: false, type: '', item: null });
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '20px' }}>🕒</span>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Student Activity & History
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Review your complete academic history, including course enrollments, payments, lesson requests, and material deliveries.
        </p>
      </div>

      {/* Modern Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: isActive ? 'var(--bg-white)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'enrollments' && (
          <EnrollmentHistoryTab onViewDetails={handleOpenDetails} />
        )}
        {activeTab === 'payments' && (
          <PaymentHistoryTab onViewDetails={handleOpenDetails} />
        )}
        {activeTab === 'lessons' && (
          <LessonRequestHistoryTab onViewDetails={handleOpenDetails} />
        )}
        {activeTab === 'tutes' && (
          <TuteRequestHistoryTab onViewDetails={handleOpenDetails} />
        )}
      </div>

      {/* Record Details Modal */}
      {modalData.open && (
        <HistoryDetailsModal
          type={modalData.type}
          item={modalData.item}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
