"use client";

import IntakeFormWizard from "../../components/forms/IntakeForm";

export default function Home() {
  
  return (
    <div className="bg-white dark:bg-gray-900 p-1 sm:p-1 lg:p-1">
      <div className="mx-auto flex flex-col items-center justify-center">
        <IntakeFormWizard />
      </div>
    </div>
  );
}
