"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import InputField from "../inputs/InputField";
import RadioGroup from "../inputs/RadioGroup";
import TextareaField from "../inputs/TextareaField";
import DateInputField from "../inputs/DateInputField";

export default function MedicalTreatmentStep() {
  const { watch, setValue } = useFormContext();

  // States for controlling add/remove
  const [treatmentCount, setTreatmentCount] = useState(1);
  const [priorInjuryCount, setPriorInjuryCount] = useState(1);

  // Watching form values
  const ambulance = watch("ambulance");
  const admitted = watch("admitted");
  const currentTreatment = watch("currentTreatment");
  const priorInjuries = watch("priorInjuries");

  // Helper: get suffix for DB field names (none, 2, 3)
  const getSuffix = (index: number) => (index === 1 ? "" : index.toString());

  /** ---------------------------
   *   CURRENT TREATMENT HANDLERS
   * --------------------------- */
  const handleAddTreatment = () => {
    if (treatmentCount < 3) setTreatmentCount((prev) => prev + 1);
  };

  const handleRemoveTreatment = () => {
    if (treatmentCount > 1) {
      const suffix = getSuffix(treatmentCount);
      const fieldsToClear = [
        `currentDoctorHospital${suffix}`,
        `currentHospitalAddressPhone${suffix}`,
        `currentTreatmentDetails${suffix}`,
        `currentTreatmentFrom${suffix}`,
        `currentTreatmentTo${suffix}`,
      ];
      fieldsToClear.forEach((field) => setValue(field, null));
      setTreatmentCount((prev) => prev - 1);
    }
  };

  /** ---------------------------
   *   PRIOR INJURY HANDLERS
   * --------------------------- */
  const handleAddPriorInjury = () => {
    if (priorInjuryCount < 3) setPriorInjuryCount((prev) => prev + 1);
  };

  const handleRemovePriorInjury = () => {
    if (priorInjuryCount > 1) {
      const suffix = getSuffix(priorInjuryCount);
      const fieldsToClear = [
        `priorDoctorHospital${suffix}`,
        `priorHospitalAddressPhone${suffix}`,
        `priorTreatmentDetails${suffix}`,
        `priorTreatmentFrom${suffix}`,
        `priorTreatmentTo${suffix}`,
        `priorInsuranceClaims${suffix}`,
        `priorAttorneys${suffix}`,
      ];
      fieldsToClear.forEach((field) => setValue(field, null));
      setPriorInjuryCount((prev) => prev - 1);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* 🚑 Ambulance Section */}
      <RadioGroup
        name="ambulance"
        label="Transported by ambulance? *"
        options={["Yes", "No"]}
      />
      {ambulance === "Yes" && (
        <InputField
          name="ambulanceCompany"
          label="Name of Ambulance Company *"
        />
      )}

      {/* 🏥 Admitted Section */}
      <RadioGroup
        name="admitted"
        label="Were you admitted? *"
        options={["Yes", "No"]}
      />
      {admitted === "Yes" && (
        <InputField name="lengthOfStay" label="Length of stay" />
      )}

      {/* 💊 Current Treatments */}
      <RadioGroup
        name="currentTreatment"
        label="Is There Any Current/On going Treatments Due to Accident? *"
        options={["Yes", "No"]}
      />
      {currentTreatment === "Yes" && (
        <div className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 space-y-3">
          <p className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-400">
            Current Treatment Details
          </p>

          {[...Array(treatmentCount)].map((_, index) => {
            const suffix = getSuffix(index + 1);
            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
              >
                <p className="font-bold text-xs mb-2 text-gray-700 dark:text-gray-400">
                  Treatment {index + 1}
                </p>
                <InputField
                  name={`currentDoctorHospital${suffix}`}
                  label="Doctor/Hospital Name"
                />
                <InputField
                  name={`currentHospitalAddressPhone${suffix}`}
                  label="Hospital Address & Phone No."
                />
                <TextareaField
                  name={`currentTreatmentDetails${suffix}`}
                  label="Treatment Details"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateInputField
                    name={`currentTreatmentFrom${suffix}`}
                    label="Treatment Date (From)"
                  />
                  <DateInputField
                    name={`currentTreatmentTo${suffix}`}
                    label="Treatment Date (To)"
                  />
                </div>
              </div>
            );
          })}

          <div className="flex gap-3">
            {treatmentCount < 3 && (
              <button
                type="button"
                onClick={handleAddTreatment}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                + Add More
              </button>
            )}
            {treatmentCount > 1 && (
              <button
                type="button"
                onClick={handleRemoveTreatment}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                − Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🧍 Body Parts Affected */}
      <TextareaField name="bodyPartsAffected" label="Body Parts Affected" />

      {/* 🩹 Prior Injuries */}
      <RadioGroup
        name="priorInjuries"
        label="Any Prior Injuries? *"
        options={["Yes", "No"]}
      />
      {priorInjuries === "Yes" && (
        <div className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 space-y-3">
          <p className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-400">
            Prior Injuries Details
          </p>

          {[...Array(priorInjuryCount)].map((_, index) => {
            const suffix = getSuffix(index + 1);
            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
              >
                <p className="font-bold text-xs mb-2 text-gray-700 dark:text-gray-400">
                  Prior Injury {index + 1}
                </p>
                <InputField
                  name={`priorDoctorHospital${suffix}`}
                  label="Doctor/Hospital Name"
                />
                <InputField
                  name={`priorHospitalAddressPhone${suffix}`}
                  label="Hospital Address & Phone No."
                />
                <TextareaField
                  name={`priorTreatmentDetails${suffix}`}
                  label="Treatment Details"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateInputField
                    name={`priorTreatmentFrom${suffix}`}
                    label="Treatment Date (From)"
                  />
                  <DateInputField
                    name={`priorTreatmentTo${suffix}`}
                    label="Treatment Date (To)"
                  />
                </div>
                <InputField
                  name={`priorInsuranceClaims${suffix}`}
                  label="Prior Insurance Claim #"
                />
                <InputField
                  name={`priorAttorneys${suffix}`}
                  label="Prior Attorneys for PI / WC Injuries"
                />
              </div>
            );
          })}

          <div className="flex gap-3">
            {priorInjuryCount < 3 && (
              <button
                type="button"
                onClick={handleAddPriorInjury}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                + Add More
              </button>
            )}
            {priorInjuryCount > 1 && (
              <button
                type="button"
                onClick={handleRemovePriorInjury}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                − Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
