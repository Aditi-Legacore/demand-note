'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import IntakeFormWizard from '@/components/forms/IntakeForm';
import NewIntakeModal from '@/components/NewIntakeModal';

export default function EmbedFormPage() {
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(true);
  const [isIframe, setIsIframe] = useState(false);

  // Determine iframe + initial modal state only once
  useEffect(() => {
    const ref = searchParams.get('ref');

    // show modal only if ref is NOT present
    if (ref) {
      setShowModal(false);
    }

    // check iframe safely
    if (typeof window !== 'undefined') {
      setIsIframe(window.self !== window.top);
    }
  }, [searchParams]);

  const handleClose = () => {
    setShowModal(false);

    // notify parent only if inside iframe
    if (isIframe) {
      window.parent.postMessage('closeModal', '*');
    }
  };

  // const handleModalSuccess = () => {
  //   setShowModal(false);

  //   if (isIframe) {
  //     window.parent.postMessage('formStarted', '*');
  //   }
  // };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {showModal ? (
          <NewIntakeModal onClose={handleClose} />
        ) : (
          <IntakeFormWizard isEmbedded={true} />
        )}
      </div>
    </div>
  );
}
